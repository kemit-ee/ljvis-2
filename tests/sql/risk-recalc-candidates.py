#!/usr/bin/env python3
"""Test the deployed candidate SQL with isolated temporary fixture tables.

Usage: python3 tests/sql/risk-recalc-candidates.py -- psql -U ljvis -d ljvis_db
"""
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[2]
query = (root / 'DSL/Resql/ljvis/POST/risk_score/select_companies_for_recalc.sql').read_text()
for table in ('compound_form', 'foreign_violation_form', 'sp_driver_form', 'sp_teammate_form'):
    query = query.replace('forms.' + table, 'fixture_' + table)
query = query.replace('risk.company_risk_score', 'fixture_company_risk_score')
sql = r'''
BEGIN;
CREATE TEMP TABLE fixture_compound_form (company_reg_code TEXT, compound_form_key BIGINT, status TEXT, created_at TIMESTAMPTZ);
CREATE TEMP TABLE fixture_foreign_violation_form (company_reg_code TEXT, status TEXT, created_at TIMESTAMPTZ);
CREATE TEMP TABLE fixture_sp_driver_form (compound_form_key BIGINT, status TEXT, created_at TIMESTAMPTZ);
CREATE TEMP TABLE fixture_sp_teammate_form (LIKE fixture_sp_driver_form);
CREATE TEMP TABLE fixture_company_risk_score (company_reg_code TEXT, total_controls INT, risk_score NUMERIC, created_at TIMESTAMPTZ);
-- All publications are older than the recent band and inside the two-year window.
INSERT INTO fixture_foreign_violation_form
SELECT code, 'published', now() - INTERVAL '30 days'
FROM unnest(ARRAY['80410960','90000001','90000002','90000003','90000004']) code;
INSERT INTO fixture_compound_form VALUES ('90000005', 5, 'published', now() - INTERVAL '30 days');
INSERT INTO fixture_company_risk_score VALUES
 ('80410960', 0, NULL, now() - INTERVAL '1 day'),
 ('90000002', 1, 10, now() - INTERVAL '1 day'),
 ('90000003', 0, NULL, now() - INTERVAL '2 days'),
 ('90000003', 2, 20, now() - INTERVAL '1 day'),
 ('90000004', 2, 20, now() - INTERVAL '2 days'),
 ('90000004', 0, NULL, now() - INTERVAL '1 day'),
 ('90000005', 0, NULL, now() - INTERVAL '1 day');
CREATE TEMP VIEW actual_candidates AS
'''+query+r'''
DO $$
DECLARE actual TEXT[];
BEGIN
 SELECT array_agg(company_reg_code ORDER BY company_reg_code) INTO actual FROM actual_candidates;
 IF actual IS DISTINCT FROM ARRAY['80410960','90000001','90000004','90000005']::TEXT[] THEN
   RAISE EXCEPTION 'Candidate selection mismatch: %', actual;
 END IF;
END $$;
ROLLBACK;
'''
command = sys.argv[1:]
if command[:1] == ['--']:
    command = command[1:]
if not command:
    raise SystemExit(__doc__)
subprocess.run(command + ['-X', '-q', '-v', 'ON_ERROR_STOP=1'], input=sql, text=True, check=True)
print('OK: old published controls repair unchecked snapshots; latest valid scores stay excluded')
