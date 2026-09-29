#!/usr/bin/env python3
"""Exercise actual ERRU changesets in a disposable database on the isolated CI server."""
import subprocess
import sys
import uuid
from pathlib import Path

command = sys.argv[sys.argv.index('--') + 1:] + ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1']
name = 'erru_schema_test_' + uuid.uuid4().hex[:12]
root = Path(__file__).resolve().parents[2] / 'DSL/Liquibase/changelog'


def run(statement, database=None, check=True):
    args = command.copy()
    if database:
        args[args.index('-d') + 1] = database
    return subprocess.run(args + ['-c', statement], text=True, capture_output=True, check=check)


def migration(stem):
    return (root / (stem + '.sql')).read_text()


business = '20261201085000-erru-inbound-business-recovery'
transport = '20261201090000-initial-erru-xml-inbox-outbox'
run('CREATE DATABASE ' + name)
try:
    run("CREATE SCHEMA erru; CREATE TABLE erru.rsi_message(technical_id text, direction text, status text); INSERT INTO erru.rsi_message VALUES ('duplicate','incoming','answered'),('duplicate','incoming','answered');", name)
    failure = run(migration(business), name, check=False)
    assert failure.returncode != 0 and 'Duplicate incoming RSI answered technical_id' in failure.stderr, failure.stderr
    assert run("SELECT to_regclass('erru.inbound_audit_key') IS NULL", name).stdout.strip() == 't'
    # Only disposable fixture rows are removed, never real snapshot history.
    run('DELETE FROM erru.rsi_message', name)
    run(migration(business), name)
    run(migration(transport), name)
    run(migration(transport + '-rollback'), name)
    result = run("SELECT to_regclass('erru.xml_inbox') IS NULL AND to_regclass('erru.xml_outbox') IS NULL AND to_regclass('erru.inbound_audit_key') IS NOT NULL AND to_regclass('erru.uq_rsi_inbound_answered_technical_id') IS NOT NULL AND to_regprocedure('erru.record_inbound_audit(text,bigint,text,jsonb)') IS NOT NULL", name)
    assert result.stdout.strip() == 't', result.stdout
    run(migration(business + '-rollback'), name)
    assert run("SELECT to_regclass('erru.inbound_audit_key') IS NULL AND to_regclass('erru.rsi_message') IS NOT NULL", name).stdout.strip() == 't'
    print('PASS duplicate preflight, transport rollback isolation, business rollback')
finally:
    run('DROP DATABASE ' + name + ' WITH (FORCE)')
