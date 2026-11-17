#!/usr/bin/env python3
"""xml-inbox/claim-due + finish: which erru.xml_inbox rows the XTR cron picks up (async queue and recovery of the
synchronous NU/NCR/RSI), batching and the retry delay. Runs the real Resql files in a disposable database.

Usage: test_xml_inbox_recovery.py -- <psql command incl. -U/-d>   (same convention as test_migrations.py)
"""
import json
import re
import subprocess
import sys
import uuid
from pathlib import Path

command = sys.argv[sys.argv.index('--') + 1:] + ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1']
name = 'erru_inbox_recovery_' + uuid.uuid4().hex[:12]
root = Path(__file__).resolve().parents[2]
changelog = root / 'DSL/Liquibase/changelog'
resql = root / 'DSL/Resql/ljvis/POST/erru/xml-inbox'


def run(statement, database=None):
    args = command.copy()
    if database:
        args[args.index('-d') + 1] = database
    return subprocess.run(args + ['-c', statement], text=True, capture_output=True, check=True).stdout


def sql(path, **params):
    text = re.sub(r'/\*.*?\*/', '', (resql / path).read_text(), count=1, flags=re.S)
    for key in sorted(params, key=len, reverse=True):
        value = params[key]
        text = text.replace(':' + key, str(value) if isinstance(value, int) else "'" + str(value).replace("'", "''") + "'")
    return text


def migration(stem):
    return (changelog / (stem + '.sql')).read_text()


MSGS = 'NotifyUnfitness_Request,NotifyCheckResult_Request,RoadSideInspection_Request,CheckGoodRepute_Request,CheckTransportUndertakingData_Request'
run('CREATE DATABASE ' + name)
try:
    run(migration('20261201090000-initial-erru-xml-inbox-outbox'), name)
    run(migration('20261228100000-erru-xml-inbox-request-json'), name)

    def row(label, status, claimed_by=None, lease='NULL', nxt='NULL', request_json="'{}'", mtype='NotifyUnfitness_Request', age=0):
        run(f"INSERT INTO erru.xml_inbox (message_type, technical_id, raw_xml, payload_digest, status, claimed_by, lease_expires_at, next_attempt_at, request_json, received_at, business_case_id) "
            f"VALUES ('{mtype}', '{uuid.uuid4()}', '<x/>', 'd', '{status}', {claimed_by and repr(claimed_by) or 'NULL'}, {lease}, {nxt}, {request_json}, now() - interval '{age} seconds', '{label}')", name)

    xtr, asy = 'erru-xml-adapter-xtr', 'erru-xml-adapter-xtr-async'
    row('retry-due', 'received', nxt="now() - interval '1 second'", age=50)           # sent back for a retry, delay passed
    row('retry-unset', 'received', age=40)                                            # manually reset failed row
    row('retry-later', 'received', nxt="now() + interval '20 seconds'", age=60)       # Hub redelivery still has time
    row('lease-expired', 'processing', xtr, lease="now() - interval '1 second'", age=30)
    row('lease-live', 'processing', xtr, lease="now() + interval '2 minutes'", age=70)
    row('async-due', 'processing', asy, lease="now() + interval '5 minutes'", nxt="now() - interval '1 second'", mtype='CheckGoodRepute_Request', age=20)
    row('async-later', 'processing', asy, lease="now() + interval '5 minutes'", nxt="now() + interval '30 seconds'", mtype='CheckGoodRepute_Request', age=80)
    row('no-request-json', 'received', request_json='NULL', age=90)                   # one-way / Java rows: never ours
    row('failed', 'failed', age=100)                                                  # manual recovery only
    row('processed', 'processed', age=110)
    row('other-type', 'received', mtype='NotifyUnfitness_Acknowledgement', age=120)   # not a request type

    out = run(sql('claim-due.sql', messageTypes=MSGS, batchSize=10), name)
    claimed = sorted(json.loads(l)['inboxId'] for l in out.splitlines() if l.startswith('{'))
    labels = run("SELECT business_case_id FROM erru.xml_inbox WHERE id = ANY(ARRAY[" + ','.join(map(str, claimed)) + "]) ORDER BY business_case_id", name).split()
    assert labels == ['async-due', 'lease-expired', 'retry-due', 'retry-unset'], labels
    state = run("SELECT DISTINCT status || '/' || claimed_by || '/' || (lease_expires_at > now() + interval '2 minutes')::text || '/' || (next_attempt_at IS NULL)::text FROM erru.xml_inbox WHERE id = ANY(ARRAY[" + ','.join(map(str, claimed)) + "])", name).strip()
    assert state == 'processing/erru-xml-adapter-xtr/true/true', state
    assert run("SELECT count(*) FROM erru.xml_inbox WHERE attempts = 1", name).strip() == '4'
    # nothing left that is due
    assert run(sql('claim-due.sql', messageTypes=MSGS, batchSize=10), name).strip() == ''

    # batching: oldest first, at most batchSize
    for i in range(5):
        row(f'batch-{i}', 'received', age=1000 + i)
    out = run(sql('claim-due.sql', messageTypes=MSGS, batchSize=3), name)
    assert len([l for l in out.splitlines() if l.startswith('{')]) == 3, out
    out = run(sql('claim-due.sql', messageTypes=MSGS, batchSize=99), name)
    assert len([l for l in out.splitlines() if l.startswith('{')]) == 2, out  # capped at 10, 2 left

    # finish: retry -> received, due in ~30 s; requeue keeps the async queue; fencing by attempts
    inbox = run("SELECT id FROM erru.xml_inbox WHERE business_case_id = 'retry-due'", name).strip()
    assert run(sql('finish.sql', inboxId=int(inbox), outcome='retry', attempts=99, error='x'), name).strip() == ''  # wrong fencing token
    assert run(sql('finish.sql', inboxId=int(inbox), outcome='retry', attempts=1, error='transient'), name).strip().startswith('received')
    due = run(f"SELECT (next_attempt_at > now() + interval '20 seconds' AND next_attempt_at < now() + interval '40 seconds')::text, claimed_by IS NULL FROM erru.xml_inbox WHERE id = {inbox}", name).strip()
    assert due == 'true|t', due

    # one-way recovery list: received + request_json + older than a minute + due; read only
    row('ow-recent', 'received', mtype='NotifyUnfitness_Acknowledgement', age=5)
    row('ow-later', 'received', mtype='NotifyUnfitness_Acknowledgement', nxt="now() + interval '20 seconds'", age=90)
    row('ow-nojson', 'received', mtype='NotifyUnfitness_Acknowledgement', request_json='NULL', age=90)
    ow = run(sql('due-oneway.sql', messageTypes='NotifyUnfitness_Acknowledgement,CheckGoodRepute_Response'), name)
    rows = [json.loads(l) for l in ow.splitlines() if l.startswith('{')]
    assert len(rows) == 1 and rows[0]['messageType'] == 'NotifyUnfitness_Acknowledgement' and rows[0]['sha256'] == 'd', rows
    assert run("SELECT count(*) FROM erru.xml_inbox WHERE business_case_id = 'other-type' AND status = 'received'", name).strip() == '1'  # nothing claimed

    # finish processed keeps the conflict audit lines, an explicit error still overwrites
    row('conflict', 'processing', xtr, lease="now() + interval '1 minute'")
    cid = int(run("SELECT id FROM erru.xml_inbox WHERE business_case_id = 'conflict'", name).strip())
    run(f"UPDATE erru.xml_inbox SET attempts = 1, last_error = 'old\nconflicting redelivery rejected at t, attempted payload_digest=abc' WHERE id = {cid}", name)
    assert run(sql('finish.sql', inboxId=cid, outcome='processed', attempts=1, error=''), name).strip().startswith('processed')
    kept = run(f"SELECT last_error FROM erru.xml_inbox WHERE id = {cid}", name).strip()
    assert kept.startswith('conflicting redelivery rejected') and 'abc' in kept, kept
    print('PASS claim-due selection, batching, retry delay, fencing, one-way recovery and conflict log')
finally:
    run('DROP DATABASE ' + name + ' WITH (FORCE)')
