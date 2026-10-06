#!/usr/bin/env python3
"""Concurrent writers on one labour inspection act: UI (Resql update.sql / delete.sql), e-toimik
(apply_etoimik_decision.sql) and the X-tee repeat (forms.register_external_labour_inspection).

Every writer appends a snapshot numbered latest.revision + 1 (UNIQUE (key, revision), changeset
20261208100000). The test holds one writer's transaction open, runs the other in between, and checks that
history never forks: the loser writes nothing (UI/e-toimik: duplicate-key error or no row, X-tee:
re-decides on the fresh state).

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
            if 'duplicate key value' in err:
                return 'REJECTED: duplicate key'
            raise RuntimeError(err.strip()[:2000])
        return out.strip()


def held(sql, seconds=3):
    """Run sql inside a transaction that stays open for a while after the write."""
    return f'BEGIN;\n{sql};\nSELECT pg_sleep({seconds});\nCOMMIT;\n'


def soap(external_id, value):
    return (f"SELECT outcome FROM forms.register_external_labour_inspection('xroad-v2', {lit(external_id)}, "
            f"'new_snapshot', 'Race Inspektor', '2026-06-15', 'cargo', 'OÜ Race', '12345678', '1', 'false', "
            f"'{{\"a\":{value}}}', '[]', '', '', '', '', 'xroad')")


def ui_update(key, status, value=1, expected_revision=''):
    return render('update.sql', {
        'key': key, 'status': status, 'inspectorName': 'Race Inspektor', 'inspectionDate': '2026-06-15',
        'inspectionType': 'cargo', 'companyName': 'OÜ Race', 'companyRegCode': '12345678', 'vehicleCount': '1',
        'totalDriversCount': '', 'controlsMatrix': '{"a":%d}' % value, 'prescriptionComposed': 'false',
        'punishedPersonIdCode': '', 'punishedPersonFirstName': '', 'punishedPersonLastName': '',
        'proceedingReferenceNumber': '', 'violations': '[]', 'created_by': 'ui', 'expected_revision': expected_revision})


def history(db, key):
    rows = db.run(f"""SELECT status || '/' || created_by || '/' || coalesce(controls_matrix->>'a', '-')
        FROM forms.labour_inspection_form WHERE labour_inspection_form_key = {key} ORDER BY created_at, id;""")
    revisions = db.run(f"""SELECT string_agg(revision::text, ',' ORDER BY created_at, id)
        FROM forms.labour_inspection_form WHERE labour_inspection_form_key = {key};""")
    count = len(rows.split('\n')) if rows else 0
    check(revisions == ','.join(str(n) for n in range(1, count + 1)),
          f'act {key}: revisions 1..n in creation order, no two snapshots on the same predecessor')
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

    # A: a UI re-save of the confirmed act is in flight, X-tee sends changed data.
    external_id, key = new_act(db, 'A')
    ui_out, soap_out = concurrently(db, ui_update(key, 'confirmed'), soap(external_id, 2))
    check(ui_out != '' and soap_out == 'conflict',
          'A: UI save wins; the concurrent changed X-tee repeat answers conflict (409), not updated')
    check(history(db, key) == ['confirmed/xroad/1', 'confirmed/ui/1'], 'A: the UI snapshot is kept; X-tee wrote nothing')

    # B: X-tee changed repeat is in flight (it is refused, nothing written), the user saves the act.
    external_id, key = new_act(db, 'B')
    soap_out, ui_out = concurrently(db, soap(external_id, 2), ui_update(key, 'confirmed', value=2))
    check(soap_out == 'conflict' and ui_out != '', 'B: X-tee changed repeat is refused (conflict); the concurrent UI save is stored')
    check(history(db, key) == ['confirmed/xroad/1', 'confirmed/ui/2'], 'B: history holds the X-tee snapshot and the UI save only')

    # C: UI delete is in flight, X-tee sends changed data.
    external_id, key = new_act(db, 'C')
    deleted = render('delete.sql', {'id': key, 'status': 'deleted', 'created_by': 'ui'})
    ui_out, soap_out = concurrently(db, deleted, soap(external_id, 2))
    check(ui_out != '' and soap_out == 'conflict', 'C: delete wins; the concurrent X-tee repeat answers conflict, act is not revived')
    check(history(db, key)[-1] == 'deleted/ui/1', 'C: act stays deleted')

    # D: two UI saves on top of the same state.
    _, key = new_act(db, 'D')
    first_out, second_out = concurrently(db, ui_update(key, 'confirmed'), ui_update(key, 'confirmed', value=2))
    check(first_out != '' and second_out.startswith('REJECTED'), 'D: of two concurrent UI writes only the first is stored, the second is rejected')

    # E: e-toimik publishes while the user re-saves the confirmed act (edit_locked).
    _, key = new_act(db, 'E')
    db.run(ui_update(key, 'confirmed') + ';')
    publish = render('apply_etoimik_decision.sql', {'key': key, 'found': 'true', 'enforcementDecision': 'Otsus',
                                                     'proceedingClosureBasis': '', 'created_by': 'e-toimik'})
    ui_out, etoimik_out = concurrently(db, ui_update(key, 'confirmed'), publish)
    check(ui_out != '' and etoimik_out.startswith('REJECTED'), 'E: e-toimik does not publish on top of a concurrently changed act; next sync decides')
    history(db, key)

    # F: the user opened the act at revision 1, a UI save was stored meanwhile (revision 2), then the
    # user saves with expected_revision=1: optimistic lock -> no row (the UI answers 409 form_modified).
    external_id, key = new_act(db, 'F')
    db.run(ui_update(key, 'confirmed', value=2) + ';')
    stale = db.run(ui_update(key, 'confirmed', expected_revision='1') + ';')
    check(stale == '' and history(db, key) == ['confirmed/xroad/1', 'confirmed/ui/2'],
          'F: save of a stale revision writes nothing (form_modified)')

    print(f'PASS: {len(CHECKS)} checks')
    for message in CHECKS:
        print('  ✓', message)


if __name__ == '__main__':
    main()
