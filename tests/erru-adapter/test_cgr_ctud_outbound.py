#!/usr/bin/env python3
"""Run the CGR/CTUD outbound migration, lifecycle and merge checks on a disposable PostgreSQL container.
Usage: python3 tests/erru-adapter/test_cgr_ctud_outbound.py CONTAINER
The container must have an empty rsi_test database. Never use a shared database.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json
import re
import subprocess
import sys

container = sys.argv[1]
root = Path(__file__).resolve().parents[2]
changelog = root / 'DSL/Liquibase/changelog'
resql = root / 'DSL/Resql/ljvis/POST/erru'


def sql(statement, check=True):
    result = subprocess.run(['docker', 'exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'rsi_test', '-XqAt', '-v', 'ON_ERROR_STOP=1'],
                            input=statement, text=True, capture_output=True, check=False)
    if check and result.returncode:
        raise AssertionError(result.stderr)
    return result


def query(path, **values):
    text = (resql / path).read_text()
    quoted = {k: ('NULL' if v is None else "'" + str(v).replace("'", "''") + "'") for k, v in values.items()}
    return sql(re.sub(r'(?<!:):([a-zA-Z][a-zA-Z0-9_]*)', lambda m: quoted[m[1]], text))


def status(table, key):
    return sql(f"SELECT status||':'||version FROM erru.{table} WHERE {table.split('_')[0]}_request_key={key} ORDER BY version DESC, id DESC LIMIT 1").stdout.strip()


sql('''CREATE SCHEMA classifier;
CREATE SEQUENCE classifier.seq_classifier_value_key;
CREATE TABLE classifier.classifier(id bigserial, classifier_key bigint, code text, created_at timestamptz DEFAULT now());
CREATE TABLE classifier.classifier_value(classifier_value_key bigint, classifier_key bigint, code text, name text, valid_from date, created_by text);
INSERT INTO classifier.classifier(classifier_key,code) VALUES (1,'CGR_REQUEST_STATUS'),(2,'CTUD_REQUEST_STATUS');''')
sql((changelog / '20260801100000-initial-erru-ctud.sql').read_text())
sql((changelog / '20260812100000-initial-erru-cgr.sql').read_text())
migration = (changelog / '20261222100000-cgr-ctud-outbound-xml.sql').read_text()
sql(migration)
sql(migration)
assert sql("SELECT count(*) FROM classifier.classifier_value").stdout.strip() == '5'

# ── CGR ──────────────────────────────────────────────────────────────────────
sql("""INSERT INTO erru.cgr_request(cgr_request_key,version,direction,status,business_case_id,cgr_from,cgr_to,originating_authority,request_source,request_purpose,tm_first_name,tm_family_name,tm_date_of_birth)
       VALUES (1,1,'outgoing','initiated','CGR-T-1','EE','ZZ','EE-TRAM','CA','Issue','Mari','Maasikas','1980-05-01')""")
with ThreadPoolExecutor(2) as pool:
    results = list(pool.map(lambda _: sql("SELECT count(*) FROM erru.cgr_begin_send(1,'test','MAR','MASACAS','')").stdout.strip(), range(2)))
assert sorted(results) == ['0', '1'], results
assert status('cgr_request', 1) == 'sending:2'
env = sql("SELECT technical_id||'|'||workflow_id||'|'||tm_first_name_search_key FROM erru.cgr_request WHERE cgr_request_key=1 AND status='sending'").stdout.strip().split('|')
assert len(env) == 3 and env[2] == 'MAR', env
# The Hub acknowledgement keeps the reserved envelope.
assert query('cgr/append-transition.sql', key=1, newStatus='sent', memberStates='', tmFirstNameSearchKey='', tmFamilyNameSearchKey='', errorMessage='', created_by='t').stdout.strip()
assert sql("SELECT technical_id||'|'||workflow_id FROM erru.cgr_request WHERE cgr_request_key=1 AND status='sent'").stdout.strip() == env[0] + '|' + env[1]
# No bypass of the reservation: a fresh send cannot be appended from initiated or sent any more.
assert query('cgr/append-transition.sql', key=1, newStatus='sent', memberStates='', tmFirstNameSearchKey='', tmFamilyNameSearchKey='', errorMessage='', created_by='t').stdout.strip() == ''
workflow = env[1]
de = {'memberStateCode': 'DE', 'statusCode': 'Found', 'transportManagerDetails': {'respondingAuthority': 'DE-BAG'}}
lv = {'memberStateCode': 'LV', 'statusCode': 'Timeout'}
first = query('cgr/apply-response.sql', workflowId=workflow, memberStates=json.dumps([de])).stdout.strip()
assert first.endswith('|responded|' + workflow), first
replay = query('cgr/apply-response.sql', workflowId=workflow, memberStates=json.dumps([de])).stdout.strip()
assert replay == '', 'identical replay must not append a snapshot'
query('cgr/apply-response.sql', workflowId=workflow, memberStates=json.dumps([lv]))
lv_found = {'memberStateCode': 'LV', 'statusCode': 'NotFound'}
# Replacing the first entry keeps its position, so replaying it later is still an identical no-op.
query('cgr/apply-response.sql', workflowId=workflow, memberStates=json.dumps([de]))
assert query('cgr/apply-response.sql', workflowId=workflow, memberStates=json.dumps([de])).stdout.strip() == '', 'replay of a non-last member state'
query('cgr/apply-response.sql', workflowId=workflow, memberStates=json.dumps([lv_found]))
states = json.loads(sql("SELECT member_states FROM erru.cgr_request WHERE cgr_request_key=1 ORDER BY version DESC, id DESC LIMIT 1").stdout.strip())
assert [s['memberStateCode'] + ':' + s['statusCode'] for s in states] == ['DE:Found', 'LV:NotFound'], states
assert status('cgr_request', 1) == 'responded:6', status('cgr_request', 1)
assert query('cgr/apply-response.sql', workflowId='00000000-0000-4000-8000-000000000000', memberStates=json.dumps([de])).stdout.strip() == ''
assert query('cgr/get-by-workflow-id.sql', workflow_id=workflow).stdout.strip().startswith('1|6|responded|CGR-T-1')
# Per-country resend: status and workflow stay, technicalId changes, answers stay.
resend = query('cgr/begin-send.sql', key=1, created_by='t', tmFirstNameSearchKey='', tmFamilyNameSearchKey='', targetMemberState='LV').stdout.strip().split('|')
assert resend[1] == workflow and resend[0] != env[0] and resend[3] == 'responded', resend
assert len(json.loads(sql("SELECT member_states FROM erru.cgr_request WHERE cgr_request_key=1 ORDER BY version DESC, id DESC LIMIT 1").stdout.strip())) == 2
# A rejected draft can be retried from error and keeps its workflow.
sql("""INSERT INTO erru.cgr_request(cgr_request_key,version,direction,status,business_case_id,cgr_to,tm_first_name,tm_family_name,tm_date_of_birth)
       VALUES (2,1,'outgoing','initiated','CGR-T-2','LV','A','B','1990-01-01')""")
assert sql("SELECT count(*) FROM erru.cgr_begin_send(2,'t','','','LV')").stdout.strip() == '0', 'resend of an unsent draft'
sql("SELECT * FROM erru.cgr_begin_send(2,'t','','','')")
assert query('cgr/append-transition.sql', key=2, newStatus='error', memberStates='', tmFirstNameSearchKey='', tmFamilyNameSearchKey='', errorMessage='rejected', created_by='t').stdout.strip()
wf2 = sql("SELECT workflow_id FROM erru.cgr_request WHERE cgr_request_key=2 AND status='sending'").stdout.strip()
assert sql("SELECT count(*) FROM erru.cgr_begin_send(2,'t','','','')").stdout.strip() == '1'
assert sql("SELECT workflow_id FROM erru.cgr_request WHERE cgr_request_key=2 ORDER BY version DESC, id DESC LIMIT 1").stdout.strip() == wf2
# send_unknown is final until a response arrives.
assert query('cgr/append-transition.sql', key=2, newStatus='send_unknown', memberStates='', tmFirstNameSearchKey='', tmFamilyNameSearchKey='', errorMessage='unknown', created_by='t').stdout.strip()
assert sql("SELECT count(*) FROM erru.cgr_begin_send(2,'t','','','')").stdout.strip() == '0'
assert query('cgr/apply-response.sql', workflowId=wf2, memberStates=json.dumps([de])).stdout.strip()
assert status('cgr_request', 2).startswith('responded')

# ── CTUD ─────────────────────────────────────────────────────────────────────
sql("""INSERT INTO erru.ctud_request(ctud_request_key,version,direction,status,business_case_id,ctud_from,ctud_to,originating_authority,request_source,request_purpose,transport_undertaking_name,community_licence_number)
       VALUES (1,1,'outgoing','initiated','CTUD-T-1','EE','DE','EE-TRAM','CA','Issue','Test OU','EE-1')""")
with ThreadPoolExecutor(2) as pool:
    results = list(pool.map(lambda _: sql("SELECT count(*) FROM erru.ctud_begin_send(1,'test')").stdout.strip(), range(2)))
assert sorted(results) == ['0', '1'], results
assert status('ctud_request', 1) == 'sending:2'
ids = sql("SELECT technical_id||'|'||workflow_id FROM erru.ctud_request WHERE ctud_request_key=1 AND status='sending'").stdout.strip()
args = dict(key=1, technicalId='', workflowId='', respondingAuthority='', responseStatusCode='', responseStatusMessage='', responseContent='', errorMessage='', created_by='t')
assert query('ctud/append-transition.sql', newStatus='sent', **args).stdout.strip()
assert sql("SELECT technical_id||'|'||workflow_id FROM erru.ctud_request WHERE ctud_request_key=1 AND status='sent'").stdout.strip() == ids
# initiated -> sent is gone: sending must be reserved first.
sql("""INSERT INTO erru.ctud_request(ctud_request_key,version,direction,status,business_case_id,ctud_to,transport_undertaking_name,community_licence_number)
       VALUES (2,1,'outgoing','initiated','CTUD-T-2','DE','Test OU','EE-1')""")
assert query('ctud/append-transition.sql', newStatus='sent', **{**args, 'key': 2}).stdout.strip() == ''
content = json.dumps({'transportUndertakingName': 'Rhein', 'numberOfVehicles': 3})
responded = query('ctud/append-transition.sql', newStatus='responded', **{**args, 'respondingAuthority': 'DE-BAG', 'responseStatusCode': 'Found', 'responseContent': content})
assert 'responded' in responded.stdout and 'Found' in responded.stdout, responded.stdout
assert query('ctud/append-transition.sql', newStatus='responded', **{**args, 'responseStatusCode': 'Found'}).stdout.strip() == '', 'duplicate response'
assert query('ctud/get-by-workflow-id.sql', workflow_id=ids.split('|')[1]).stdout.strip().startswith('1|')
# Rejected request retry, then an unknown outcome that a response can still resolve.
sql("SELECT * FROM erru.ctud_begin_send(2,'t')")
assert query('ctud/append-transition.sql', newStatus='error', **{**args, 'key': 2, 'errorMessage': 'rejected'}).stdout.strip()
assert sql("SELECT count(*) FROM erru.ctud_begin_send(2,'t')").stdout.strip() == '1'
assert query('ctud/append-transition.sql', newStatus='send_unknown', **{**args, 'key': 2, 'errorMessage': 'unknown'}).stdout.strip()
assert sql("SELECT count(*) FROM erru.ctud_begin_send(2,'t')").stdout.strip() == '0'
assert query('ctud/append-transition.sql', newStatus='responded', **{**args, 'key': 2, 'responseStatusCode': 'NotFound'}).stdout.strip()

# ── Journal and rollback ─────────────────────────────────────────────────────
sql("INSERT INTO erru.xml_outbound_dispatch(technical_id,workflow_id,message_type,xml_body) VALUES (gen_random_uuid(),gen_random_uuid(),'CGR','<x/>')")
bad = sql("INSERT INTO erru.xml_outbound_dispatch(technical_id,workflow_id,message_type,xml_body) VALUES (gen_random_uuid(),gen_random_uuid(),'RSI','<x/>')", check=False)
assert bad.returncode != 0
blocked = sql((changelog / '20261222100000-cgr-ctud-outbound-xml-rollback.sql').read_text(), check=False)
assert blocked.returncode != 0 and 'requires the outbound XML lifecycle migration' in blocked.stderr, blocked.stderr
sql('DELETE FROM erru.xml_outbound_dispatch; DELETE FROM erru.cgr_request WHERE status IN (\'sending\',\'send_unknown\',\'responded\'); DELETE FROM erru.ctud_request WHERE status IN (\'sending\',\'send_unknown\');')
sql((changelog / '20261222100000-cgr-ctud-outbound-xml-rollback.sql').read_text())
assert sql("SELECT to_regprocedure('erru.cgr_begin_send(bigint,text,text,text,text)') IS NULL AND to_regclass('erru.xml_outbound_dispatch') IS NULL").stdout.strip() == 't'
print('PASS CGR/CTUD begin-send, response merge and replay, resend, retry, send_unknown, journal, guarded rollback')
