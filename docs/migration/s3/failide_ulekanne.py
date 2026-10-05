#!/usr/bin/env python3
"""LJVIS1 manused -> S3. Kaivitatakse PARAST pohimigratsiooni.

Seos vorm <-> failikaust tuleb juba migreeritud PostgreSQL-ist, seega SQL Serverit,
varukoopiat ega Dockerit siin vaja ei ole.

Korduv kaivitus on ohutu: iga fail saab sisu jargi (sha256) pusiva S3 votme.
Juba ulekantud fail jaetakse vahele, faile ei kirjutata ule.

    python3 failide_ulekanne.py --dry-run    # ainult aruanne, midagi ei laadita
    python3 failide_ulekanne.py              # tegelik ulekanne
"""
import argparse
import hashlib
import os
import re
import sys
import unicodedata
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
LOG = HERE / f"failide-ulekanne-{datetime.now():%Y%m%d-%H%M%S}.log"
report = []

# LJVIS2 uleslaadimistee kasutab neid nimesid S3 votmes (DSL/Ruuter .../files/upload.yml)
FORM_TYPE = {
    'forms.sp_driver_form': 'sp-driver-form',
    'forms.sp_teammate_form': 'sp-teammate-form',
    'forms.vehicle_technical_form': 'vehicle-technical-form',
    'forms.trailer_technical_form': 'trailer-technical-form',
    'forms.kv_form': 'transport-interruption',
    'forms.adr_form': 'adr-form',
    'forms.good_repute_form': 'good-repute-form',
    'forms.foreign_violation_form': 'foreign-violation-form',
    'forms.labour_inspection_form': 'labour-inspection-form',
}
CONTENT_TYPE = {
    '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.tif': 'image/tiff', '.tiff': 'image/tiff',
    '.doc': 'application/msword', '.xls': 'application/vnd.ms-excel',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.asice': 'application/vnd.etsi.asic-e+zip', '.zip': 'application/zip',
    '.txt': 'text/plain', '.msg': 'application/vnd.ms-outlook',
}
REGISTRY = """
CREATE TABLE IF NOT EXISTS migration.file_link (
    pile_guid       text        NOT NULL,
    source_name     text        NOT NULL,
    sha256          text        NOT NULL,
    size_bytes      bigint      NOT NULL,
    form_number     text        NOT NULL,
    s3_key          text        NOT NULL,
    uploaded_at     timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (pile_guid, source_name, sha256)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_file_link_key ON migration.file_link (s3_key);
"""


def say(line=''):
    print(line, flush=True)
    report.append(line)


def finish(code):
    LOG.write_text('\n'.join(report) + '\n', encoding='utf-8')
    print(f'\nLogi: {LOG.name}')
    sys.exit(code)


def load_env():
    path = HERE / '.env'
    if not path.exists():
        say('.env puudub. Kopeeri .env.example failiks .env ja taida see.')
        finish(2)
    for raw in path.read_text(encoding='utf-8').splitlines():
        line = raw.strip()
        if line and not line.startswith('#') and '=' in line:
            key, _, value = line.partition('=')
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def safe_name(raw):
    """Sama reegel nagu s3-proxy's, et voti oleks URL-ohutu ja loetav."""
    name = unicodedata.normalize('NFC', raw).replace('/', '').replace('\\', '').replace('..', '')
    name = ''.join(c for c in name if not (ord(c) < 0x20 or ord(c) == 0x7F))
    name = ''.join(c if (c.isalpha() or c.isdigit() or c in ' .-()[]') else '_' for c in name)
    name = re.sub(r'\s+', '_', name)
    name = re.sub(r'_+', '_', name)
    name = re.sub(r'^[._-]+', '', name).strip()
    return name or 'fail'


def sha256_of(path):
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(4 * 1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--dry-run', action='store_true',
                        help='ei laadi ega kirjuta midagi; naitab ainult, mis juhtuks')
    args = parser.parse_args()
    load_env()

    say(f"LJVIS manuste ulekanne, {datetime.now():%Y-%m-%d %H:%M}")
    say('Reziim: PROOV (midagi ei laadita)' if args.dry_run else 'Reziim: TEGELIK ULEKANNE')

    root = Path(os.environ.get('FILES_ROOT', '')).expanduser()
    if not root.is_dir():
        say(f'Failikausta ei leitud: {root}   (.env: FILES_ROOT)')
        finish(2)
    prefix = os.environ.get('S3_KEY_PREFIX', 'protokollid').strip('/')

    try:
        import psycopg2
    except ImportError:
        say('Puudub teek psycopg2. Kaivita: python3 -m pip install -r requirements.txt')
        finish(2)
    connection = psycopg2.connect(
        host=os.environ.get('PG_HOST', 'localhost'), port=os.environ.get('PG_PORT', '5432'),
        dbname=os.environ['PG_DB'], user=os.environ['PG_USER'],
        password=os.environ.get('PG_PASSWORD', ''), connect_timeout=15)
    connection.autocommit = False

    bucket = client = None
    if not args.dry_run:
        try:
            import boto3
        except ImportError:
            say('Puudub teek boto3. Kaivita: python3 -m pip install -r requirements.txt')
            finish(2)
        bucket = os.environ['S3_BUCKET']
        client = boto3.client(
            's3', endpoint_url=os.environ.get('S3_ENDPOINT') or None,
            region_name=os.environ.get('S3_REGION', 'auto'),
            aws_access_key_id=os.environ['S3_ACCESS_KEY_ID'],
            aws_secret_access_key=os.environ['S3_SECRET_ACCESS_KEY'])

    with connection, connection.cursor() as cur:
        if not args.dry_run:
            cur.execute(REGISTRY)
        cur.execute("""
            SELECT lower(btrim(v.value)), l.target_table, l.target_form_number
            FROM staging.raw_control_form_value v
            JOIN migration.form_link l ON l.legacy_source='ControlForm'
                                      AND l.legacy_id = v.control_form_id::text
            WHERE v.classifier_name = 'filePileGuid'
              AND nullif(btrim(v.value),'') IS NOT NULL
              AND l.target_table <> 'forms.compound_form'
        """)
        piles = {}
        for guid, table, number in cur.fetchall():
            piles.setdefault(guid, (table, number))
        say(f'Migreeritud vorme failiviitega: {len(piles)}')

        # "Juba olemas" loetakse sellest tabelist, mida rakendus ise kasutab, mitte
        # migration.file_link-ist: nii ei teki duplikaate ka siis, kui migratsiooni
        # abitabel on vahepeal kustutatud. Kehtib ka proovikaivitusel.
        cur.execute('SELECT s3_key FROM forms.form_attachment')
        known = {row[0] for row in cur.fetchall()}

        uploaded = skipped = failed = orphan = missing = 0
        total_bytes = 0
        on_disk = {e.name.lower() for e in os.scandir(root) if e.is_dir()}
        orphan = len(on_disk - set(piles))
        missing = len(set(piles) - on_disk)

        for guid, (table, number) in sorted(piles.items(), key=lambda kv: kv[1][1]):
            folder = root / guid
            if not folder.is_dir():
                continue
            form_type = FORM_TYPE.get(table)
            if not form_type:
                say(f'  VAHELE: tundmatu vormituup {table}')
                continue
            for path in sorted(folder.iterdir()):
                if not path.is_file():
                    continue
                try:
                    digest = sha256_of(path)
                    size = path.stat().st_size
                except OSError as exc:
                    failed += 1
                    say(f'  VIGA lugemisel ({number}): {exc.strerror}')
                    continue
                key = f'{prefix}/{form_type}/{number}/{digest[:12]}_{safe_name(path.name)}'
                if key in known:
                    skipped += 1
                    continue
                total_bytes += size
                if args.dry_run:
                    uploaded += 1
                    continue
                try:
                    client.upload_file(str(path), bucket, key, ExtraArgs={
                        'ContentType': CONTENT_TYPE.get(path.suffix.lower(),
                                                        'application/octet-stream')})
                except Exception as exc:
                    failed += 1
                    say(f'  VIGA laadimisel ({number}): {type(exc).__name__}')
                    continue
                cur.execute("""INSERT INTO migration.file_link
                    (pile_guid, source_name, sha256, size_bytes, form_number, s3_key)
                    VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING""",
                    (guid, path.name, digest, size, number, key))
                cur.execute("""INSERT INTO forms.form_attachment
                    (form_number, file_name, s3_key, status, created_by)
                    VALUES (%s,%s,%s,'active','migratsioon')""",
                    (number, path.name, key))
                known.add(key)
                uploaded += 1
        if not args.dry_run:
            connection.commit()

    say()
    say('===== TULEMUS =====')
    say(f'  Ule kantud failid      : {uploaded}' if not args.dry_run
        else f'  Kantaks ule            : {uploaded}')
    say(f'  Vahele jaetud (juba olemas): {skipped}')
    say(f'  Vigu                   : {failed}')
    say(f'  Andmemaht              : {total_bytes / 1024**2:.1f} MB')
    say(f'  Kaustu kettal ilma vormita : {orphan}')
    say(f'  Vorme ilma kaustata        : {missing}')
    if args.dry_run:
        say('\nProov. Tegelikuks ulekandeks kaivita ilma --dry-run.')
    finish(1 if failed else 0)


if __name__ == '__main__':
    main()
