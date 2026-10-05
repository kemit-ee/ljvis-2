#!/usr/bin/env python3
"""LJVIS1 .bak -> LJVIS2 PostgreSQL: one command, one log.

Reads settings from .env next to this file. Starts a disposable SQL Server in
Docker, restores the backup read-only, applies the LJVIS2 Liquibase changelog to
the PostgreSQL database given in .env, then runs the migration in rehearsal mode
for the agreed time window.

The log written here is aggregate only: counts, statuses, field NAMES and issue
codes. Detailed output stays in private/ and runs/ and must be reviewed before sharing.
"""
import argparse
import calendar
import json
import secrets
import traceback
from urllib.parse import quote, urlencode
import os
import re
import shutil
import subprocess
import sys
import uuid
from datetime import date, datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]                       # repository root
ETL = ROOT / 'DSL' / 'migration'
LIQUIBASE = ROOT / 'DSL' / 'Liquibase'
SESSION_ID = uuid.uuid4().hex
PROJECT = 'ljvis-migration-' + SESSION_ID[:12]
SQL_PORT = None
SA_PASSWORD = 'A1!' + secrets.token_urlsafe(24)        # disposable container only
SOURCE_DB = 'ljvis_source'
LOG = HERE / f"ljvis-migratsioon-{datetime.now():%Y%m%d-%H%M%S}-{SESSION_ID[:8]}.log"

out = []
PRIVATE = HERE / 'private' / SESSION_ID
GUARD = None
CONTAINERS = set()


class MigrationFailure(Exception):
    pass


def private_text(name, content):
    PRIVATE.mkdir(parents=True, exist_ok=True, mode=0o700)
    (PRIVATE / name).write_text(content or '', encoding='utf-8')


def cutoff_date(today):
    year = today.year - 3
    return today.replace(year=year, day=min(today.day, calendar.monthrange(year, today.month)[1]))



def say(line=''):
    print(line, flush=True)
    out.append(line)
    LOG.write_text('\n'.join(out)+'\n', encoding='utf-8')


def fail(message, hint=''):
    raise MigrationFailure(message + ('; ' + hint if hint else ''))


def finish(code):
    LOG.write_text('\n'.join(out) + '\n', encoding='utf-8')
    say_only = f"\nLogi: {LOG.name}"
    print(say_only, flush=True)
    sys.exit(code)


def env(name, default=None, required=False):
    value = os.environ.get(name, default)
    if required and not value:
        fail(f'.env: {name} on maaramata')
    return value


def load_env(path):
    path = Path(path).resolve()
    if not path.exists():
        fail('.env puudub', 'Kopeeri .env.example failiks .env ja taida see.')
    for raw in path.read_text(encoding='utf-8').splitlines():
        line = raw.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, _, value = line.partition('=')
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in (chr(34), chr(39)):
            value = value[1:-1]
        os.environ[key.strip()] = value


def run(argv, step, timeout=1800, check=True, environment=None):
    result = subprocess.run(argv, capture_output=True, text=True, timeout=timeout, env=environment)
    private_text(re.sub(r'[^a-zA-Z0-9_-]', '_', step)+'.log', result.stdout+'\n'+result.stderr)
    if check and result.returncode != 0:
        fail(f'{step} (kood {result.returncode})', 'Detailne vealogi on private-kaustas; ara saada seda kontrollimata.')
    return result


def main():
    global SQL_PORT, GUARD
    os.umask(0o077)
    parser = argparse.ArgumentParser(description='Backup -> separate EMPTY rehearsal database')
    parser.add_argument('--env-file', type=Path, default=HERE/'.env')
    args = parser.parse_args()
    say(f"LJVIS migratsioon, algus {datetime.now():%Y-%m-%d %H:%M}")
    load_env(args.env_file)
    if sys.version_info < (3,11):
        fail("Python 3.11+ on vajalik")

    # ---- 1. prerequisites -------------------------------------------------
    if not shutil.which('docker'):
        fail('Dockerit ei leitud', 'Paigalda Docker Desktop ja kaivita see.')
    if run(['docker', 'info'], 'docker info', 60, check=False).returncode:
        fail('Docker ei tooda', 'Kaivita Docker Desktop ja proovi uuesti.')
    try:
        import psycopg2, pymssql          # noqa: F401
    except ImportError as exc:
        fail(f'Python teek puudub: {exc.name}',
             'Kaivita: python3 -m pip install -r requirements.txt')
    for path in (ETL / 'migrate.py', LIQUIBASE / 'changelog.yaml'):
        if not path.exists():
            fail(f'Fail puudub: {path}', 'Kopeeri kogu pakett tervikuna.')

    backup = Path(env('BACKUP_FILE', required=True)).expanduser()
    if not backup.is_absolute():
        backup = args.env_file.resolve().parent / backup
    backup = backup.resolve()
    os.environ['BACKUP_FILE'] = str(backup)
    if not backup.is_file():
        fail(f'Varukoopiat ei leitud: {backup}')
    size_gb = backup.stat().st_size / 1024**3
    say(f"Varukoopia olemas ({size_gb:.1f} GB)")

    cutoff = env('CUTOFF') or str(cutoff_date(date.today()))
    date.fromisoformat(cutoff)
    say(f"Ajapiir: {cutoff} (migreeritakse sellest kuupaevast alates)")

    # ---- 2. PostgreSQL reachable and writable -----------------------------
    say(f"Kirjutan andmebaasi: {env('PG_DB', required=True)} "
        f"serveris {env('PG_HOST', required=True)}:{env('PG_PORT','5432')}")
    import psycopg2
    pg_args = dict(host=env('PG_HOST', required=True), port=env('PG_PORT', '5432'),
                   dbname=env('PG_DB', required=True), user=env('PG_USER', required=True),
                   password=env('PG_PASSWORD', ''), sslmode=env('PG_SSLMODE','prefer'), connect_timeout=15)
    if env('PG_SSLROOTCERT'):
        pg_args['sslrootcert'] = str(Path(env('PG_SSLROOTCERT')).expanduser().resolve())
    GUARD = psycopg2.connect(**pg_args)
    with GUARD.cursor() as cur:
        cur.execute('SELECT pg_try_advisory_lock(784192632)')
        if not cur.fetchone()[0]:
            fail('Sihtbaasis juba kaib teine migratsiooni proov')
        ensure_empty(cur)
        cur.execute('SHOW server_version')
        version = cur.fetchone()[0]
        # Roll back the permissions probe; never drop an existing user schema.
        cur.execute('CREATE SCHEMA migration_probe_' + SESSION_ID)
    GUARD.rollback()
    say(f'PostgreSQL {version}: tuhi sihtbaas ja CREATE oigus kontrollitud.')

    # ---- 3. disposable SQL Server ----------------------------------------
    say('\nKaivitan ajutise SQL Serveri...')
    container = PROJECT + '-mssql'
    CONTAINERS.add(container)
    docker_env = dict(os.environ, MSSQL_SA_PASSWORD=SA_PASSWORD)
    run(['docker', 'run', '-d', '--name', container,
         '--platform', 'linux/amd64',
         '-e', 'ACCEPT_EULA=Y', '-e', 'MSSQL_SA_PASSWORD', '-e', 'MSSQL_PID=Developer',
         '-p', '127.0.0.1::1433',
         '-v', f'{backup}:/backup/source.bak:ro',
         'mcr.microsoft.com/mssql/server:2022-latest'], 'SQL_Server_start', 900, environment=docker_env)
    binding = run(['docker','port',container,'1433/tcp'],'SQL_Server_port',30).stdout.strip()
    SQL_PORT = binding.rsplit(':',1)[-1]
    if not SQL_PORT.isdigit():
        fail('SQL Serveri ajutist porti ei leitud')
    wait_and_restore()
    apply_liquibase(pg_args)
    code = run_migration(cutoff, pg_args)
    data = collect(pg_args)
    if not completed_summary(data,code):
        say('ULEKANNE PEATATUD: andmetes on lahendamata kusimusi, mis tuleb enne'
            ' ulekannet ara lahendada. Saada logi meile.')
        return 2
    # Separate read-only coordinator verification, not just successful process exit.
    verify = run([sys.executable,str(ETL/'migrate.py'),'--verify'], 'verify',7200,
                 check=False,environment=migration_environment(cutoff,pg_args,os.environ['MIGRATION_RUN_ID']))
    if verify.returncode not in (0,2):
        fail('Soltumatu --verify ebaonnestus')
    verified = json.loads((HERE/'runs'/os.environ['MIGRATION_RUN_ID']/'summary.json').read_text())
    if verified.get('integrity_problems'):
        fail('--verify leidis terviklikkuse probleeme')
    say('Tehniline proov ja jarelkontroll on labitud. Lahtiseid arilisi kusimusi'
        ' ja puuduvaid allikaid see ei lahenda.')
    return code


def completed_summary(data, code):
    state = (data.get('run') or [{}])[0]
    if code not in (0,2) or state.get('status') not in ('succeeded','needs_review'):
        fail('ETL tehniline viga; sihtbaas sailitati uurimiseks')
    if state.get('current_step') != 'complete':
        return False
    if data.get('integrity_problems') or any(r['eligible'] != r['linked'] for r in data.get('coverage',[])):
        fail('Ulekande katvuse voi terviklikkuse kontroll ebaonnestus')
    return True


def ensure_empty(cur):
    cur.execute("""SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname NOT IN ('public','information_schema')
                      AND nspname !~ '^pg_')
       OR EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                  WHERE n.nspname='public')
       OR EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public')
       OR EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public')
       OR EXISTS (SELECT 1 FROM pg_extension WHERE extname<>'plpgsql')""")
    if cur.fetchone()[0]:
        fail('Sihtandmebaas ei ole tuhi', 'Loo uus eraldi proovibaas; olemasolevaid andmeid ei muudeta.')


def wait_and_restore():
    import pymssql, time
    deadline = time.monotonic() + 600
    while time.monotonic() < deadline:
        try:
            conn = pymssql.connect(server='127.0.0.1', port=SQL_PORT, user='sa',
                                   password=SA_PASSWORD, database='master',
                                   autocommit=True, timeout=1800, login_timeout=10)
            break
        except Exception:
            time.sleep(5)
    else:
        fail('SQL Server ei kaivitunud 10 minutiga',
             'ARM-protsessoril kaib emulatsioon aeglaselt; proovi uuesti.')
    say('SQL Server tootab. Taastan varukoopiat (voib votta mitu minutit)...')
    with conn:
        cur = conn.cursor(as_dict=True)
        cur.execute("RESTORE HEADERONLY FROM DISK=N'/backup/source.bak'")
        headers = cur.fetchall()
        full = [h for h in headers if h['BackupType'] == 1]
        if len(full) != 1:
            fail(f'Varukoopias peab olema tapselt uks taisvarukoopia (leitud {len(full)})',
                 'Diferentsiaal- voi logivarukoopia vajab eraldi taastamisplaani.')
        position = int(full[0]['Position'])
        cur.execute(f"RESTORE FILELISTONLY FROM DISK=N'/backup/source.bak' WITH FILE={position}")
        moves = []
        for index, item in enumerate(cur.fetchall()):
            if item['Type'] not in ('D', 'L'):
                fail('Varukoopia sisaldab FILESTREAM andmeid', 'Vajalik eraldi taastamisplaan.')
            logical = item['LogicalName'].replace("'", "''")
            suffix = 'ldf' if item['Type'] == 'L' else 'mdf'
            moves.append(f"MOVE N'{logical}' TO N'/var/opt/mssql/data/src_{index}.{suffix}'")
        cur.execute(f"RESTORE DATABASE [{SOURCE_DB}] FROM DISK=N'/backup/source.bak' "
                    f"WITH FILE={position}, " + ', '.join(moves) + ', RECOVERY')
        while cur.nextset():
            pass
        cur.execute(f'ALTER DATABASE [{SOURCE_DB}] SET ALLOW_SNAPSHOT_ISOLATION ON')
        cur.execute(f'ALTER DATABASE [{SOURCE_DB}] SET READ_ONLY WITH NO_WAIT')
    say('Varukoopia taastatud, allikas on kirjutuskaitstud.')


def apply_liquibase(pg_args):
    say('\nRakendan LJVIS2 andmebaasiskeemi...')
    host = env('PG_DOCKER_HOST') or pg_args['host']
    network = []
    if host in ('localhost','127.0.0.1','::1'):
        if sys.platform.startswith('linux'):
            network = ['--network','host']
        else:
            host = 'host.docker.internal'
    if ':' in host and not host.startswith('['):
        host = '['+host+']'
    options = {'sslmode':pg_args['sslmode']}
    mounts = ['-v',f'{LIQUIBASE}:/liquibase/project:ro']
    if pg_args.get('sslrootcert'):
        mounts += ['-v',pg_args['sslrootcert']+':/liquibase/root.crt:ro']
        options['sslrootcert']='/liquibase/root.crt'
    url = f"jdbc:postgresql://{host}:{pg_args['port']}/{quote(pg_args['dbname'],safe='')}?{urlencode(options)}"
    name = PROJECT+'-liquibase'
    CONTAINERS.add(name)
    settings = dict(os.environ,LIQUIBASE_COMMAND_URL=url,LIQUIBASE_COMMAND_USERNAME=pg_args['user'],
                    LIQUIBASE_COMMAND_PASSWORD=pg_args['password'])
    run(['docker','run','--rm','--name',name,*network,*mounts,
         '-e','LIQUIBASE_COMMAND_URL','-e','LIQUIBASE_COMMAND_USERNAME','-e','LIQUIBASE_COMMAND_PASSWORD',
         'liquibase/liquibase:4.29','--search-path=/liquibase/project',
         '--changelog-file=changelog.yaml','update','-DAUDIT_SALT='+secrets.token_hex(32)],
        'Liquibase',1800,environment=settings)
    say('Skeem rakendatud.')


def migration_environment(cutoff, pg_args, run_id):
    # Do not inherit unrelated ETL flags/connections from the administrator shell.
    environment = {k:v for k,v in os.environ.items()
                   if not k.startswith(('SOURCE_','TARGET_','MIGRATION_','RAVEN','PG','RUN_ID'))}
    environment.update(
        MIGRATION_ENV_FILE=os.devnull,RUN_ID=run_id,
        SOURCE_MSSQL_HOST='127.0.0.1',SOURCE_MSSQL_PORT=str(SQL_PORT),SOURCE_MSSQL_USER='sa',
        SOURCE_MSSQL_PASSWORD=SA_PASSWORD,SOURCE_MSSQL_DB=SOURCE_DB,SOURCE_MSSQL_ISOLATION='SNAPSHOT',
        TARGET_PG_HOST=pg_args['host'],TARGET_PG_PORT=str(pg_args['port']),TARGET_PG_DB=pg_args['dbname'],
        TARGET_PG_USER=pg_args['user'],TARGET_PG_PASSWORD=pg_args['password'],TARGET_PG_SSLMODE=pg_args['sslmode'],
        CUTOFF=cutoff,SOURCE_LABEL='bak:source',SOURCE_FROZEN='yes',TARGET_DISPOSABLE='yes',
        MIGRATION_LOG_DIR=str(HERE/'runs'),PYTHONDONTWRITEBYTECODE='1')
    if pg_args.get('sslrootcert'):
        environment['PGSSLROOTCERT']=pg_args['sslrootcert']
    return environment


def run_migration(cutoff, pg_args):
    say('\nKaivitan migratsiooni...')
    run_id = str(uuid.uuid4())
    environment = migration_environment(cutoff,pg_args,run_id)
    result = run([sys.executable,str(ETL/'migrate.py'),'--rehearsal','--sql-only'],
                 'ETL',7200,check=False,environment=environment)
    for line in (result.stdout or '').splitlines():
        if line.startswith('[migration]'):
            say('  ' + line)
    os.environ['MIGRATION_RUN_ID'] = run_id
    if result.returncode not in (0,2):
        say(f'ETL ebaonnestus (kood {result.returncode}); detailid private-kaustas.')
    return result.returncode


def collect(pg_args):
    """Aggregate result summary. No source values are read or written."""
    import psycopg2
    run_id = os.environ.get('MIGRATION_RUN_ID')
    summary = HERE / 'runs' / run_id / 'summary.json'
    say('\n===== TULEMUS =====')
    if not summary.exists():
        say('Kokkuvotet ei tekkinud; vaata ulalolevaid veateateid.')
        return {}
    data = json.loads(summary.read_text())
    run = data['run'][0] if data['run'] else {}
    done = run.get('current_step') == 'complete'
    say('Seis: ' + ('ulekanne tehtud' if done else 'ulekanne EI JOUDNUD lopuni')
        + f"   (tehniliselt: {run.get('status')} / {run.get('current_step')})")
    say('\nVormid tuubi kaupa (valitud / ule kantud):')
    for row in data.get('coverage', []):
        say(f"  {row['form_type']:<26} {row['eligible']:>6} / {row['linked']:>6}")
    say('\nSeosed / erinevad sihtvormid (koondvorm voib olla jagatud):')
    with psycopg2.connect(**pg_args) as conn, conn.cursor() as cur:
        cur.execute('SELECT target_table,count(*),count(DISTINCT target_key) FROM migration.form_link GROUP BY 1 ORDER BY 1')
        for table, links, distinct_forms in cur.fetchall():
            say(f'  {table:<34} {links:>6} / {distinct_forms:>6}')
    say('\nLeiud (kood ja arv):')
    for row in data.get('findings', []):
        say(f"  {row['severity']:<8} {row['issue']:<38} {row['count']:>6}")
    say('\nVaikevaartused ja lahendamata vastendused:')
    for row in data.get('quality', []):
        say(f"  {row['target_table']:<30} {row['column_name']:<28} {row['issue']:<22} {row['affected_forms']:>5}")
    problems = data.get('integrity_problems') or []
    say(f"\nTerviklikkuse probleemid: {'puuduvad' if not problems else str(len(problems))+' kontrolli ebaonnestus'}")
    return data


def entrypoint():
    os.umask(0o077)
    code = 1
    try:
        code = main()
    except MigrationFailure as exc:
        say('EI ONNESTUNUD: '+str(exc))
    except SystemExit as exc:
        code = int(exc.code or 0)
    except KeyboardInterrupt:
        say('Katkestatud; sihtbaas voib olla osaliselt ette valmistatud.')
        code = 130
    except Exception as exc:
        private_text('exception.log',traceback.format_exc())
        say('EI ONNESTUNUD: '+type(exc).__name__+'; detailid private-kaustas.')
    finally:
        for container in CONTAINERS:
            try:
                result = subprocess.run(['docker','rm','-f','-v',container],capture_output=True,text=True,timeout=120)
                # Liquibase --rm may already have removed its container.
                if result.returncode and 'No such container' not in result.stderr:
                    say('Ajutise konteineri koristus ebaonnestus: '+container)
                    code = 1
            except Exception:
                say('Ajutise konteineri koristus vajab kontrolli: '+container)
                code = 1
        if GUARD is not None:
            GUARD.close()
        if CONTAINERS:
            say('Selle kaivituse ajutiste konteinerite koristus lopetatud.')
        finish(code)


if __name__ == '__main__':
    entrypoint()
