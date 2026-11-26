#!/usr/bin/env python3
"""erru/nu/audit-event-exists in a disposable PostgreSQL database: the answer for existing, missing and other-type
events, and the plan. Resql reuses its prepared statement, so PostgreSQL may use a generic plan; the generic plan
must use idx_ae_nu_inbound_message_key, not a scan of the whole audit.audit_event table.

Usage: test_nu_audit_event_exists.py -- <psql command incl. -U/-d>   (same convention as test_xml_inbox_recovery.py)
"""
from pathlib import Path
import re
import subprocess
import sys
import uuid

command = sys.argv[sys.argv.index('--') + 1:] + ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1']
name = 'nu_audit_exists_' + uuid.uuid4().hex[:12]
root = Path(__file__).resolve().parents[2]
changelog = root / 'DSL/Liquibase/changelog'
query = re.sub(r'/\*.*?\*/', '', (root / 'DSL/Resql/ljvis/POST/erru/nu/audit-event-exists.sql').read_text(),
               count=1, flags=re.S).strip().rstrip(';').replace(':message_key', '$1')


def run(sql, database=name):
    args = command.copy()
    args[args.index('-d') + 1] = database
    return subprocess.run(args + ['-c', sql], text=True, capture_output=True, check=True).stdout.strip()


run('CREATE DATABASE ' + name, database=command[command.index('-d') + 1])
try:
    run((changelog / '20260605100000-initial-audit.sql').read_text())
    for _ in range(2):  # idempotent
        run((changelog / '20261229160000-audit-nu-inbound-message-key-index.sql').read_text())
    run("""
        ALTER TABLE audit.audit_event DISABLE TRIGGER USER;  -- test data only: skip the hash chain
        INSERT INTO audit.audit_event (event_id, event_type, event_category, description, log_content, created_by)
        SELECT 'e' || g,
               CASE WHEN g % 3 = 0 THEN 'nu.inbound_request.store' ELSE 'form.save' END,
               'x', 'd',
               CASE WHEN g % 3 = 0 THEN jsonb_build_object('nuMessageKey', (g / 3)::text, 'nuFrom', 'DE')
                    ELSE jsonb_build_object('nuMessageKey', 'other-' || g) END,
               'system'
          FROM generate_series(1, 30000) g;
        -- the same key on another event type must not count
        INSERT INTO audit.audit_event (event_id, event_type, event_category, description, log_content, created_by)
        VALUES ('x1', 'ncr.inbound_request.serve', 'x', 'd', '{"nuMessageKey": "777777"}', 'system');
        ANALYZE audit.audit_event;
    """)

    def exists(key):
        return run(f"PREPARE q(text) AS {query}; EXECUTE q('{key}'); DEALLOCATE q;")

    assert exists('42') == 't', 'existing NU audit event'
    assert exists('999999') == 'f', 'missing key'
    assert exists('777777') == 'f', 'same key on another event type'
    assert exists('') == 'f', 'empty key'

    plan = run(f"SET plan_cache_mode = force_generic_plan; PREPARE q(text) AS {query}; EXPLAIN EXECUTE q('42');")
    assert 'idx_ae_nu_inbound_message_key' in plan and 'Seq Scan' not in plan, plan

    run((changelog / '20261229160000-audit-nu-inbound-message-key-index-rollback.sql').read_text())
    assert run("SELECT to_regclass('audit.idx_ae_nu_inbound_message_key') IS NULL") == 't'
    print('PASS audit-event-exists: existing, missing, other type, empty key; generic plan uses the index; rollback')
finally:
    run('DROP DATABASE ' + name + ' WITH (FORCE)', database=command[command.index('-d') + 1])
