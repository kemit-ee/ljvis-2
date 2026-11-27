#!/usr/bin/env python3
"""xml-inbox/accept + claim-due + due-oneway + finish on the append-only inbox (erru.xml_inbox receipt, erru.xml_inbox_event history,
erru.xml_inbox_current view): which rows the XTR cron picks up (async queue and recovery of the synchronous NU/NCR/RSI and of the
one-way messages), batching, the retry delay, fencing and the compare-and-swap on seq. Runs the real Resql files in a disposable database.

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
    # a row of the mutable design, migrated into the first event (a conflict row is closed as failed)
    run("INSERT INTO erru.xml_inbox (message_type, technical_id, raw_xml, payload_digest, status, attempts, claimed_by, last_error) "
        f"VALUES ('NotifyUnfitness_Request', '{uuid.uuid4()}', '<x/>', 'd', 'conflict', 3, 'x', 'old error')", name)
    run(migration('20261229090000-erru-xml-inbox-append-only'), name)
    assert run("SELECT status || '/' || attempts || '/' || last_error FROM erru.xml_inbox_current", name).strip() == 'failed/3/old error'
    run("DELETE FROM erru.xml_inbox_event; DELETE FROM erru.xml_inbox", name)
    run(migration('20261229150000-erru-xml-inbox-event-queue-index'), name)
    run(migration('20261229150000-erru-xml-inbox-event-queue-index'), name)  # idempotent

    def row(label, status, claimed_by=None, lease='NULL', nxt='NULL', request_json="'{}'", mtype='NotifyUnfitness_Request', age=0, event_age=0):
        run(f"WITH r AS (INSERT INTO erru.xml_inbox (message_type, technical_id, raw_xml, payload_digest, request_json, received_at, business_case_id) "
            f"VALUES ('{mtype}', '{uuid.uuid4()}', '<x/>', 'd', {request_json}, now() - interval '{age} seconds', '{label}') RETURNING id) "
            f"INSERT INTO erru.xml_inbox_event (inbox_id, seq, event_type, attempts, claimed_by, lease_expires_at, next_attempt_at, created_at) "
            f"SELECT id, 1, '{status}', 0, {claimed_by and repr(claimed_by) or 'NULL'}, {lease}, {nxt}, now() - interval '{event_age} seconds' FROM r", name)

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
    row('stale', 'received', age=90000, event_age=90000)                              # open for > 6 h: manual reset only
    row('superseded', 'received', age=130)                                            # an open event with a later closing event
    run("INSERT INTO erru.xml_inbox_event (inbox_id, seq, event_type, attempts) "
        "SELECT id, 2, 'processed', 0 FROM erru.xml_inbox WHERE business_case_id = 'superseded'", name)

    out = run(sql('claim-due.sql', messageTypes=MSGS, batchSize=10), name)
    claimed = sorted(json.loads(l)['inboxId'] for l in out.splitlines() if l.startswith('{'))
    labels = run("SELECT business_case_id FROM erru.xml_inbox_current WHERE id = ANY(ARRAY[" + ','.join(map(str, claimed)) + "]) ORDER BY business_case_id", name).split()
    assert labels == ['async-due', 'lease-expired', 'retry-due', 'retry-unset'], labels
    state = run("SELECT DISTINCT status || '/' || claimed_by || '/' || (lease_expires_at > now() + interval '2 minutes')::text || '/' || (next_attempt_at IS NULL)::text FROM erru.xml_inbox_current WHERE id = ANY(ARRAY[" + ','.join(map(str, claimed)) + "])", name).strip()
    assert state == 'processing/erru-xml-adapter-xtr/true/true', state
    assert run("SELECT count(*) FROM erru.xml_inbox_current WHERE attempts = 1", name).strip() == '4'
    # nothing left that is due
    assert run(sql('claim-due.sql', messageTypes=MSGS, batchSize=10), name).strip() == ''

    # a row left open for more than 6 hours comes back with the manual reset of docs/integrations/erru-xml-recovery.md
    run("INSERT INTO erru.xml_inbox_event (inbox_id, seq, event_type, attempts) "
        "SELECT id, seq + 1, 'received', 0 FROM erru.xml_inbox_current WHERE business_case_id = 'stale' AND status = 'received'", name)
    out = run(sql('claim-due.sql', messageTypes=MSGS, batchSize=10), name)
    assert [json.loads(l)['attempts'] for l in out.splitlines() if l.startswith('{')] == [1], out

    # batching: oldest first, at most batchSize
    for i in range(5):
        row(f'batch-{i}', 'received', age=1000 + i)
    out = run(sql('claim-due.sql', messageTypes=MSGS, batchSize=3), name)
    assert len([l for l in out.splitlines() if l.startswith('{')]) == 3, out
    out = run(sql('claim-due.sql', messageTypes=MSGS, batchSize=99), name)
    assert len([l for l in out.splitlines() if l.startswith('{')]) == 2, out  # capped at 10, 2 left

    # Hub response window: an expired CGR / CTUD row is closed as processed (not claimed), an expired NU row is still claimed,
    # live CGR / CTUD rows go in the order of their deadline
    def dl_row(label, mtype, deadline_s):
        run(f"WITH r AS (INSERT INTO erru.xml_inbox (message_type, technical_id, raw_xml, payload_digest, request_json, deadline_at, business_case_id) "
            f"VALUES ('{mtype}', '{uuid.uuid4()}', '<x/>', 'd', '{{}}', now() + interval '{deadline_s} seconds', '{label}') RETURNING id) "
            f"INSERT INTO erru.xml_inbox_event (inbox_id, seq, event_type, attempts, claimed_by, lease_expires_at, next_attempt_at) "
            f"SELECT id, 1, 'processing', 0, '{asy}', now() + interval '5 minutes', now() - interval '1 second' FROM r", name)
    dl_row('dl-cgr-expired', 'CheckGoodRepute_Request', -30)
    dl_row('dl-ctud-expired', 'CheckTransportUndertakingData_Request', -5)
    dl_row('dl-nu-expired', 'NotifyUnfitness_Request', -30)
    dl_row('dl-cgr-late', 'CheckGoodRepute_Request', 30)
    dl_row('dl-ctud-soon', 'CheckTransportUndertakingData_Request', 5)
    got = []
    for _ in range(3):  # one row per call: the order of claiming
        out = run(sql('claim-due.sql', messageTypes=MSGS, batchSize=1), name)
        ids = [json.loads(l)['inboxId'] for l in out.splitlines() if l.startswith('{')]
        assert len(ids) == 1, out
        got.append(run(f"SELECT business_case_id FROM erru.xml_inbox WHERE id = {ids[0]}", name).strip())
    assert got == ['dl-nu-expired', 'dl-ctud-soon', 'dl-cgr-late'], got
    closed = run("SELECT i.business_case_id || '/' || c.status || '/' || c.last_error FROM erru.xml_inbox_current c JOIN erru.xml_inbox i ON i.id = c.id WHERE i.business_case_id LIKE 'dl-%expired' AND c.status = 'processed' ORDER BY 1", name).split('\n')
    closed = [c for c in closed if c]
    assert closed == ['dl-cgr-expired/processed/response deadline passed, answer not delivered',
                      'dl-ctud-expired/processed/response deadline passed, answer not delivered'], closed
    assert run(sql('claim-due.sql', messageTypes=MSGS, batchSize=10), name).strip() == ''

    # finish: retry -> received, due in ~30 s; requeue keeps the async queue; fencing by attempts
    inbox = run("SELECT id FROM erru.xml_inbox WHERE business_case_id = 'retry-due'", name).strip()
    assert run(sql('finish.sql', inboxId=int(inbox), outcome='retry', attempts=99, error='x'), name).strip() == ''  # wrong fencing token
    assert run(sql('finish.sql', inboxId=int(inbox), outcome='retry', attempts=1, error='transient'), name).strip().startswith('received')
    due = run(f"SELECT (next_attempt_at > now() + interval '20 seconds' AND next_attempt_at < now() + interval '40 seconds')::text, claimed_by IS NULL FROM erru.xml_inbox_current WHERE id = {inbox}", name).strip()
    assert due == 'true|t', due

    # one-way recovery list: received + request_json + older than a minute + due; read only
    row('ow-recent', 'received', mtype='NotifyUnfitness_Acknowledgement', age=5)
    row('ow-later', 'received', mtype='NotifyUnfitness_Acknowledgement', nxt="now() + interval '20 seconds'", age=90)
    row('ow-nojson', 'received', mtype='NotifyUnfitness_Acknowledgement', request_json='NULL', age=90)
    row('ow-lease', 'processing', xtr, lease="now() - interval '1 second'", mtype='NotifyUnfitness_Acknowledgement', age=90)
    row('ow-lease-live', 'processing', xtr, lease="now() + interval '1 minute'", mtype='NotifyUnfitness_Acknowledgement', age=90)
    row('ow-stale', 'received', mtype='NotifyUnfitness_Acknowledgement', age=90000, event_age=90000)
    ow = run(sql('due-oneway.sql', messageTypes='NotifyUnfitness_Acknowledgement,CheckGoodRepute_Response'), name)
    rows = [json.loads(l) for l in ow.splitlines() if l.startswith('{')]
    assert len(rows) == 2 and rows[0]['messageType'] == 'NotifyUnfitness_Acknowledgement' and rows[0]['sha256'] == 'd', rows
    assert run("SELECT count(*) FROM erru.xml_inbox_current WHERE business_case_id = 'other-type' AND status = 'received'", name).strip() == '1'  # nothing claimed

    # accept: fresh insert, live redelivery, takeover, conflict, never an UPDATE (the receipt is immutable)
    tid = str(uuid.uuid4())
    def accept(digest='abc', asynchronous='false'):
        out = run(sql('accept.sql', messageType='NotifyUnfitness_Request', technicalId=tid, workflowId='', businessCaseId='ACC', transportPeer='DE',
                      rawXml='<x/>', digest=digest, deadlineAt='', requestJson='{}', **{'async': asynchronous}), name).strip()
        return json.loads(out.splitlines()[0]) if out else None
    first = accept()
    assert first['inserted'] and first['claimed'] and first['status'] == 'processing' and first['attempts'] == 1, first
    again = accept()                                   # exact redelivery while the lease is live: not ours
    assert not again['inserted'] and not again['claimed'] and again['status'] == 'processing' and again['digestMatches'], again
    run(f"UPDATE erru.xml_inbox_event SET lease_expires_at = now() - interval '1 second' WHERE inbox_id = {first['inboxId']}", name)  # test setup only
    taken = accept()                                   # expired lease: taken over with a new event
    assert taken['claimed'] and taken['attempts'] == 2, taken
    assert run(f"SELECT count(*) FROM erru.xml_inbox_event WHERE inbox_id = {first['inboxId']}", name).strip() == '2'
    clash = accept(digest='other')                     # same technicalId, different content
    assert not clash['claimed'] and not clash['digestMatches'], clash
    accept(digest='other')
    assert run(f"SELECT count(*) FROM erru.xml_inbox_conflict WHERE inbox_id = {first['inboxId']}", name).strip() == '1'  # logged once

    # finish: the conflict log survives (it is its own table), a stale finisher is fenced, compare-and-swap on seq
    cid = first['inboxId']
    assert run(sql('finish.sql', inboxId=cid, outcome='processed', attempts=1, error=''), name).strip() == ''            # attempt 1 lost its lease
    assert run(sql('finish.sql', inboxId=cid, outcome='processed', attempts=2, error=''), name).strip().startswith('processed')
    assert run(sql('finish.sql', inboxId=cid, outcome='failed', attempts=2, error='late'), name).strip() == ''           # already closed
    assert run(f"SELECT count(*) FROM erru.xml_inbox_conflict WHERE inbox_id = {cid}", name).strip() == '1'
    # a second writer deciding on the same seq cannot insert: unique (inbox_id, seq)
    try:
        run(f"INSERT INTO erru.xml_inbox_event (inbox_id, seq, event_type) VALUES ({cid}, 3, 'failed')", name)
        raise AssertionError('a second event with the same seq must be refused')
    except subprocess.CalledProcessError as error:
        assert 'uq_xml_inbox_event_inbox_seq' in error.stderr, error.stderr
    # processed rows are never picked up again
    assert run(sql('claim-due.sql', messageTypes=MSGS, batchSize=10), name).strip() == ''
    print('PASS accept, claim-due selection, batching, retry delay, fencing, one-way recovery, conflict log and compare-and-swap')
    run(migration('20261229150000-erru-xml-inbox-event-queue-index-rollback'), name)
    assert run("SELECT to_regclass('erru.idx_xml_inbox_event_open_created') IS NULL", name).strip() == 't'
    # rollback copies the current state back into the legacy columns
    run(migration('20261229090000-erru-xml-inbox-append-only-rollback'), name)
    assert run(f"SELECT status || '/' || attempts FROM erru.xml_inbox WHERE id = {cid}", name).strip() == 'processed/2'
    assert run("SELECT to_regclass('erru.xml_inbox_event') IS NULL", name).strip() == 't'
finally:
    run('DROP DATABASE ' + name + ' WITH (FORCE)')
