"""Verify e-Toimik snapshot updates in an empty PostgreSQL test database.

Run: python3 tests/etoimik/verify_publish.py -- <psql command and arguments>
The transaction rolls back all test data and tables.
"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
QUERIES = {
    'sp_driver_form': 'drive-rest-form/driver/update-xroad-fields.sql',
    'sp_teammate_form': 'drive-rest-form/teammate/update-etoimik-decision.sql',
    'vehicle_technical_form': 'vehicle-technical/update-xroad-fields.sql',
    'trailer_technical_form': 'trailer-technical/update-xroad-fields.sql',
}


def render(query, **params):
    return re.sub(r'(?<!:):(\w+)', lambda m: "'" + str(params[m[1]]).replace("'", "''") + "'", query)


def verify():
    if len(sys.argv) < 3 or sys.argv[1] != '--':
        raise SystemExit(__doc__)
    statements = ['BEGIN;', 'CREATE SCHEMA forms;']
    for table, path in QUERIES.items():
        key = table + '_key'
        statements.append(f'''
CREATE TABLE forms.{table} (
  id BIGSERIAL PRIMARY KEY, {key} BIGINT, sub_form_number TEXT,
  revision INTEGER, version INTEGER, created_at TIMESTAMPTZ, created_by TEXT,
  status TEXT, enforcement_decision TEXT, proceeding_closure_basis TEXT
);
INSERT INTO forms.{table} ({key}, revision, version, created_at, status)
SELECT n, 1, 3, now() - interval '1 day', 'confirmed' FROM generate_series(1, 4) n;
''')
        query = (ROOT / 'DSL/Resql/ljvis/POST/control-forms' / path).read_text().split('*/', 1)[1]
        params = dict(key=1, found='true', enforcementDecision='', proceedingClosureBasis='VTMS § 75; VTMS § 29 lg 1 p 1')
        # Closure-only response publishes a new snapshot and retains the original.
        statements.append(render(query, **params))
        statements.append(f'''
DO $$ BEGIN
  IF (SELECT count(*) FROM forms.{table} WHERE {key} = 1) <> 2
     OR NOT EXISTS (SELECT 1 FROM forms.{table} WHERE {key} = 1 AND revision = 2
       AND status = 'published' AND enforcement_decision IS NULL
       AND proceeding_closure_basis = 'VTMS § 75; VTMS § 29 lg 1 p 1' AND version = 3)
     OR NOT EXISTS (SELECT 1 FROM forms.{table} WHERE {key} = 1 AND revision = 1
       AND status = 'confirmed' AND proceeding_closure_basis IS NULL)
  THEN RAISE EXCEPTION '{table}: closure snapshot failed'; END IF;
END $$;
''')
        # Retry is idempotent. Empty and negative outcomes must leave forms confirmed.
        statements.append(render(query, **params))
        statements.append(render(query, key=2, found='true', enforcementDecision=' ', proceedingClosureBasis=' '))
        statements.append(render(query, key=3, found='false', enforcementDecision='', proceedingClosureBasis='VTMS § 75'))
        statements.append(render(query, key=4, found='true', enforcementDecision='Otsus', proceedingClosureBasis=''))
        statements.append(f'''
DO $$ BEGIN
  IF (SELECT count(*) FROM forms.{table} WHERE {key} = 1) <> 2
     OR (SELECT count(*) FROM forms.{table} WHERE {key} IN (2, 3)) <> 2
     OR EXISTS (SELECT 1 FROM forms.{table} WHERE {key} IN (2, 3) AND status <> 'confirmed')
     OR NOT EXISTS (SELECT 1 FROM forms.{table} WHERE {key} = 4 AND status = 'published'
       AND enforcement_decision = 'Otsus' AND proceeding_closure_basis IS NULL)
  THEN RAISE EXCEPTION '{table}: retry or outcome guard failed'; END IF;
END $$;
''')
    statements.append('ROLLBACK;')
    subprocess.run(sys.argv[2:], input='\n'.join(statements), text=True, check=True)
    print('Passed: closure publication, snapshot history, retry, empty outcome, not found, sanction outcome (4 form types).')


if __name__ == '__main__':
    verify()
