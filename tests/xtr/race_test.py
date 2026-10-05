#!/usr/bin/env python3
"""Concurrent writers on one labour inspection act: UI (Resql update.sql / delete.sql), e-toimik
(apply_etoimik_decision.sql) and the X-tee repeat (forms.register_external_labour_inspection).

Every writer appends a snapshot on top of the one it read (prev_snapshot_id, unique). The test holds one
writer's transaction open, runs the other in between, and checks that history never forks: the loser
writes nothing (UI/e-toimik: no row returned, X-tee: re-decides on the fresh state).

python3 tests/xtr/race_test.py -- docker compose -f docker-compose.ci.yml -p ljvis-ci exec -T database \
  psql -X -qAt -v ON_ERROR_STOP=1 -U ljvis -d ljvis_db
"""
import argparse
import re
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RESQL = ROOT / 'DSL/Resql/ljvis/POST/control-forms/labour-inspection'
RUN = str(time.time_ns())[-9:]
CHECKS = []


def check(condition, message):
    if not condition:
        raise AssertionError(message)
    CHECKS.append(message)


def lit(value):
    return 'NULL' if value is None else "'" + str(value).replace("'", "''") + "'"


def render(name, params):
    """Resql query file with :params bound as literals (same text Resql executes)."""
    sql = (RESQL / name).read_text()
    sql = sql[sql.index('*/') + 2:].strip().rstrip(';')
    return re.sub(r'(?<![:\w]):([A-Za-z_]\w*)', lambda m: lit(params[m.group(1)]), sql)


class Db:
    def __init__(self, command):
        self.command = command

    def run(self, sql):
        result = subprocess.run(self.command, input=sql, text=True, capture_output=True)
        if result.returncode:
            raise RuntimeError(result.stderr.strip()[:2000])
        return result.stdout.strip()

    def start(self, sql):
        """Send the whole script now (the transaction starts immediately); collect output in finish()."""
        process = subprocess.Popen(self.command, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                   stderr=subprocess.PIPE, text=True)
        process.stdin.write(sql)
        process.stdin.close()
        return process

    @staticmethod
    def finish(process):
        process.stdin = None  # already sent and closed in start()
        out, err = process.communicate(timeout=60)
        if process.returncode:
            raise RuntimeError(err.strip()[:2000])
        return out.strip()


def held(sql, seconds=3):
    """Run sql inside a transaction that stays open for a while after the write."""
    return f'BEGIN;\n{sql};\nSELECT pg_sleep({seconds});\nCOMMIT;\n'


def soap(external_id, value):
    return (f"SELECT outcome FROM forms.register_external_labour_inspection('xroad-v2', {lit(external_id)}, "
            f"'new_snapshot', 'Race Inspektor', '2026-06-15', 'cargo', 'OÜ Race', '12345678', '1', 'false', "
            f"'{{\"a\":{value}}}', '[]', '', '', '', '', 'xroad')")


def ui_update(key, status, value=1):
    return render('update.sql', {
        'key': key, 'status': status, 'inspectorName': 'Race Inspektor', 'inspectionDate': '2026-06-15',
        'inspectionType': 'cargo', 'companyName': 'OÜ Race', 'companyRegCode': '12345678', 'vehicleCount': '1',
        'totalDriversCount': '', 'controlsMatrix': '{"a":%d}' % value, 'prescriptionComposed': 'false',
        'punishedPersonIdCode': '', 'punishedPersonFirstName': '', 'punishedPersonLastName': '',
        'proceedingReferenceNumber': '', 'violations': '[]', 'created_by': 'ui'})


def history(db, key):
    rows = db.run(f"""SELECT status || '/' || created_by || '/' || coalesce(controls_matrix->>'a', '-')
        FROM forms.labour_inspection_form WHERE labour_inspection_form_key = {key} ORDER BY created_at, id;""")
    forks = db.run(f"""SELECT count(*) FROM (SELECT prev_snapshot_id FROM forms.labour_inspection_form
        WHERE labour_inspection_form_key = {key} AND prev_snapshot_id IS NOT NULL
        GROUP BY prev_snapshot_id HAVING count(*) > 1) f;""")
    check(forks == '0', f'act {key}: no two snapshots built on the same predecessor')
    return rows.split('\n')


def new_act(db, name):
    external_id = f'RACE-{name}-{RUN}'
    db.run(soap(external_id, 1) + ';')
    key = db.run(f"SELECT labour_inspection_form_key FROM forms.labour_inspection_external_ref "
                 f"WHERE source = 'xroad-v2' AND external_id = {lit(external_id)};")
    return external_id, int(key)


def concurrently(db, first_sql, second_sql):
    first = db.start(held(first_sql))
    time.sleep(1)
    second_out = db.finish(db.start(second_sql + ';'))
    first_out = db.finish(first)
    return first_out, second_out


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('db_command', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.db_command[1:] if args.db_command[:1] == ['--'] else args.db_command
    if not command:
        parser.error('Provide the psql command for the disposable test database after --')
    if '-qAt' not in command:
        command = command + ['-qAt']
    db = Db(command)

    # A: UI confirmation is in flight, X-tee sends changed data.
    external_id, key = new_act(db, 'A')
    ui_out, soap_out = concurrently(db, ui_update(key, 'confirmed'), soap(external_id, 2))
    check(ui_out != '' and soap_out == 'conflict',
          'A: UI confirm wins; the concurrent changed X-tee repeat re-reads and answers conflict (409), not updated')
    check(history(db, key) == ['saved/xroad/1', 'confirmed/ui/1'], 'A: confirmation is kept; status does not fall back to saved')

    # B: X-tee changed repeat is in flight, the user confirms the state they saw.
    external_id, key = new_act(db, 'B')
    soap_out, ui_out = concurrently(db, soap(external_id, 2), ui_update(key, 'confirmed'))
    check(soap_out == 'updated' and ui_out == '',
          'B: X-tee update wins; the concurrent UI confirm of the old state writes nothing (concurrent_modification)')
    check(history(db, key) == ['saved/xroad/1', 'saved/xroad/2'], 'B: X-tee change is not overwritten by stale data')
    db.run(ui_update(key, 'confirmed', value=2) + ';')
    check(history(db, key)[-1] == 'confirmed/ui/2', 'B: after reload the user confirms the current data')

    # C: UI delete is in flight, X-tee sends changed data.
    external_id, key = new_act(db, 'C')
    deleted = render('delete.sql', {'id': key, 'status': 'deleted', 'created_by': 'ui'})
    ui_out, soap_out = concurrently(db, deleted, soap(external_id, 2))
    check(ui_out != '' and soap_out == 'conflict', 'C: delete wins; the concurrent X-tee repeat answers conflict, act is not revived')
    check(history(db, key)[-1] == 'deleted/ui/1', 'C: act stays deleted')

    # D: two UI saves on top of the same state.
    _, key = new_act(db, 'D')
    first_out, second_out = concurrently(db, ui_update(key, 'saved'), ui_update(key, 'confirmed'))
    check(first_out != '' and second_out == '', 'D: of two concurrent UI writes only the first is stored, the second gets no row')

    # E: e-toimik publishes while the user re-saves the confirmed act (edit_locked).
    _, key = new_act(db, 'E')
    db.run(ui_update(key, 'confirmed') + ';')
    publish = render('apply_etoimik_decision.sql', {'key': key, 'found': 'true', 'enforcementDecision': 'Otsus',
                                                     'proceedingClosureBasis': '', 'created_by': 'e-toimik'})
    ui_out, etoimik_out = concurrently(db, ui_update(key, 'confirmed'), publish)
    check(ui_out != '' and etoimik_out == '', 'E: e-toimik does not publish on top of a concurrently changed act; next sync decides')
    history(db, key)

    print(f'PASS: {len(CHECKS)} checks')
    for message in CHECKS:
        print('  ✓', message)


if __name__ == '__main__':
    main()
