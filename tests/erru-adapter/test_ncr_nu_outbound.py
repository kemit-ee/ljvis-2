#!/usr/bin/env python3
"""Run the NCR/NU outbound migration and lifecycle checks on a disposable PostgreSQL container.
Usage: python3 tests/erru-adapter/test_ncr_nu_outbound.py CONTAINER
The container must have an empty rsi_test database. Never use a shared database.
"""
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


def migration(stem):
    return (changelog / (stem + '.sql')).read_text()


# Minimal collaborators the existing NU functions are declared against.
sql('''CREATE SCHEMA classifier; CREATE SCHEMA forms;
CREATE SEQUENCE classifier.seq_classifier_value_key;
CREATE TABLE classifier.classifier(id bigserial, classifier_key bigint, code text, created_at timestamptz DEFAULT now());
CREATE TABLE classifier.classifier_value(classifier_value_key bigint, classifier_key bigint, code text, name text, valid_from date, created_by text);
INSERT INTO classifier.classifier(classifier_key,code) VALUES (1,'NU_MESSAGE_STATUS'),(2,'NCR_REQUEST_STATUS');
CREATE TABLE forms.good_repute_form(id bigserial, good_repute_form_key bigint, created_at timestamptz DEFAULT now(), status text, fitness_status text,
  unfit_until_date date, first_name text, last_name text, date_of_birth date, place_of_birth text, certificate_number text,
  certificate_issue_date date, certificate_country_code text);''')
for stem in ('20260816100000-initial-erru-ncr', '20260818100000-erru-ncr-response-fields', '20260820100000-erru-ncr-response-idempotency',
             '20261116100000-initial-erru-nu', '20261117120000-erru-nu-validation', '20261117121000-erru-nu-exchange',
             '20261124140000-erru-nu-align-outgoing-fields', '20261222100000-cgr-ctud-outbound-xml'):
    if stem == '20261222100000-cgr-ctud-outbound-xml':
        # The shared journal comes from the CGR/CTUD migration; only that table is needed here.
        sql('''CREATE SCHEMA IF NOT EXISTS erru; CREATE TABLE erru.xml_outbound_dispatch (technical_id UUID PRIMARY KEY, workflow_id UUID NOT NULL,
               message_type TEXT NOT NULL CHECK (message_type IN ('CGR','CTUD')), xml_body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'unknown',
               hub_http_status INTEGER, created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(), completed_at TIMESTAMPTZ);''')
        continue
    sql(migration(stem))
migration_sql = migration('20261223100000-ncr-nu-outbound-xml')
sql(migration_sql)
sql(migration_sql)
assert sql("SELECT count(*) FROM classifier.classifier_value").stdout.strip() == '4'
bad = sql("INSERT INTO erru.xml_outbound_dispatch(technical_id,workflow_id,message_type,xml_body) VALUES (gen_random_uuid(),gen_random_uuid(),'RSI','<x/>')", check=False)
assert bad.returncode != 0
for kind in ('NCR', 'NCR_RESPONSE', 'NU'):
    sql(f"INSERT INTO erru.xml_outbound_dispatch(technical_id,workflow_id,message_type,xml_body) VALUES (gen_random_uuid(),gen_random_uuid(),'{kind}','<x/>')")

# ── NCR request: initiated -> sending -> sent -> acknowledged -> responded ───
sql("""INSERT INTO erru.ncr_message(ncr_message_key,version,direction,status,business_case_id,ncr_from,ncr_to,originating_authority,request_source,request_purpose,
         transport_undertaking_name,community_licence_number,vehicle_registration_number,vehicle_registration_country,check_result,check_date)
       VALUES (1,1,'outgoing','initiated','NCR-T-1','EE','LV','TRAM','RSI','Control','Test OU','LV-1','123ABC','LV','Pass','2026-10-01')""")
from concurrent.futures import ThreadPoolExecutor
with ThreadPoolExecutor(2) as pool:
    results = list(pool.map(lambda _: sql("SELECT count(*) FROM erru.ncr_begin_send('NCR-T-1','test')").stdout.strip(), range(2)))
assert sorted(results) == ['0', '1'], results
env = sql("SELECT technical_id||'|'||workflow_id FROM erru.ncr_message WHERE business_case_id='NCR-T-1' AND status='sending'").stdout.strip()
assert env.count('|') == 1 and all(env.split('|')), env
args = dict(businessCaseId='NCR-T-1', technicalId='', workflowId='', sentAt='', ackStatusCode='', ackStatusMessage='', respondingAuthority='',
            transportUndertakingName='', responseStatusCode='', responseStatusMessage='', responseNumberOfVehicles='',
            responseCommunityLicenceStatus='', responseAddress='', responsePenaltiesImposed='', errorMessage='', created_by='t')
assert query('ncr/append-transition.sql', newStatus='sent', **args).stdout.strip()
assert sql("SELECT technical_id||'|'||workflow_id FROM erru.ncr_message WHERE business_case_id='NCR-T-1' AND status='sent'").stdout.strip() == env
# The envelope cannot be bypassed: sent -> sent and initiated -> sent are gone.
assert query('ncr/append-transition.sql', newStatus='sent', **args).stdout.strip() == ''
workflow = env.split('|')[1]
assert query('ncr/get-latest-by-workflow-id.sql', workflow_id=workflow).stdout.strip().startswith('1|3|sent|outgoing|NCR-T-1')
assert query('ncr/append-transition.sql', newStatus='acknowledged', **{**args, 'ackStatusCode': 'OK'}).stdout.strip()
assert query('ncr/append-transition.sql', newStatus='responded', **{**args, 'workflowId': workflow, 'responseStatusCode': 'OK', 'respondingAuthority': 'LV-CSDD'}).stdout.strip()
assert sql("SELECT status FROM erru.ncr_message WHERE business_case_id='NCR-T-1' ORDER BY version DESC LIMIT 1").stdout.strip() == 'responded'

# A response may beat the acknowledgement and the Hub answer; send_unknown can still be completed.
sql("""INSERT INTO erru.ncr_message(ncr_message_key,version,direction,status,business_case_id,ncr_from,ncr_to,check_result,check_date)
       VALUES (2,1,'outgoing','initiated','NCR-T-2','EE','LV','Pass','2026-10-01')""")
sql("SELECT * FROM erru.ncr_begin_send('NCR-T-2','t')")
assert query('ncr/append-transition.sql', newStatus='send_unknown', **{**args, 'businessCaseId': 'NCR-T-2', 'errorMessage': 'unknown'}).stdout.strip()
assert sql("SELECT count(*) FROM erru.ncr_begin_send('NCR-T-2','t')").stdout.strip() == '0', 'send_unknown must not be resent'
assert query('ncr/append-transition.sql', newStatus='acknowledged', **{**args, 'businessCaseId': 'NCR-T-2', 'ackStatusCode': 'OK'}).stdout.strip()
# Definite rejection: error, then a retry reserves a new technical id and keeps the workflow.
sql("""INSERT INTO erru.ncr_message(ncr_message_key,version,direction,status,business_case_id,ncr_from,ncr_to,check_result,check_date)
       VALUES (3,1,'outgoing','initiated','NCR-T-3','EE','LV','Pass','2026-10-01')""")
sql("SELECT * FROM erru.ncr_begin_send('NCR-T-3','t')")
first = sql("SELECT technical_id||'|'||workflow_id FROM erru.ncr_message WHERE business_case_id='NCR-T-3' AND status='sending'").stdout.strip().split('|')
assert query('ncr/append-transition.sql', newStatus='error', **{**args, 'businessCaseId': 'NCR-T-3', 'errorMessage': 'rejected'}).stdout.strip()
assert sql("SELECT count(*) FROM erru.ncr_begin_send('NCR-T-3','t')").stdout.strip() == '1'
second = sql("SELECT technical_id||'|'||workflow_id FROM erru.ncr_message WHERE business_case_id='NCR-T-3' ORDER BY version DESC LIMIT 1").stdout.strip().split('|')
assert second[0] != first[0] and second[1] == first[1], (first, second)

# ── NCR response to an incoming message: answer_drafted -> sending -> answered ─
sql("""INSERT INTO erru.ncr_message(ncr_message_key,version,direction,status,business_case_id,technical_id,workflow_id,ncr_from,ncr_to)
       VALUES (4,1,'incoming','answer_drafted','LV-NCR-T-4','aaaaaaaa-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000002','LV','EE')""")
assert sql("SELECT count(*) FROM erru.ncr_begin_response('NCR-T-1','t')").stdout.strip() == '0', 'an outgoing message cannot be answered'
resp = query('ncr/begin-response.sql', businessCaseId='LV-NCR-T-4', created_by='t').stdout.strip().split('|')
assert resp[1] == 'aaaaaaaa-0000-4000-8000-000000000002' and resp[3] == 'sending' and resp[0] != 'aaaaaaaa-0000-4000-8000-000000000001', resp
assert sql("SELECT technical_id FROM erru.ncr_message WHERE business_case_id='LV-NCR-T-4' ORDER BY version DESC LIMIT 1").stdout.strip() == 'aaaaaaaa-0000-4000-8000-000000000001', 'incoming technical_id must stay'
assert sql("SELECT count(*) FROM erru.ncr_begin_response('LV-NCR-T-4','t')").stdout.strip() == '0', 'already sending'
assert query('ncr/append-transition.sql', newStatus='answered', **{**args, 'businessCaseId': 'LV-NCR-T-4'}).stdout.strip()
# A negative NCRR_Ack later moves answered to error.
assert query('ncr/append-transition.sql', newStatus='error', **{**args, 'businessCaseId': 'LV-NCR-T-4', 'errorMessage': 'neg'}).stdout.strip()

# ── NU: sending -> sent, acknowledgements merge in place and replay safely ───
sql("""INSERT INTO forms.good_repute_form(good_repute_form_key,status,fitness_status,unfit_until_date,first_name,last_name,date_of_birth,place_of_birth)
       VALUES (10,'published','unfit',current_date + 30,'Mari','Maasikas','1980-05-01','Tallinn')""")
sql("""INSERT INTO erru.nu_message(nu_message_key,version,direction,status,business_case_id,nu_from,nu_to,originating_authority,request_source,request_purpose,
         unfit_start_date,tm_first_name,tm_family_name,tm_date_of_birth,tm_place_of_birth,source_good_repute_form_key,created_by)
       VALUES (1,1,'outgoing','initiated','NU-T-1','EE','ZZ','EE-TRAM','CA','Control',current_date,'Mari','Maasikas','1980-05-01','Tallinn',10,'t')""")
header = json.loads(query('nu/begin-send.sql', key=1, expectedVersion=1, firstKey='MAR', familyKey='MASACAS', actor='t', actorName='T').stdout.strip())
assert header.get('technicalId') and header.get('workflowId'), header
assert sql("SELECT status FROM erru.nu_message WHERE nu_message_key=1 ORDER BY version DESC, id DESC LIMIT 1").stdout.strip() == 'sending'
wf, tech = header['workflowId'], header['technicalId']
assert json.loads(query('nu/mark-dispatch.sql', key=1, outcome='accepted', failure='').stdout.strip())['status'] == 'sent'
again = json.loads(query('nu/mark-dispatch.sql', key=1, outcome='rejected', failure='late').stdout.strip())
assert again['status'] == 'sent' and again['changed'] is False, again
assert query('nu/get-by-workflow-id.sql', workflow_id=wf).stdout.strip().startswith('1|')
de = {'memberStateCode': 'DE', 'respondingAuthority': 'DE-BAG', 'statusCode': 'OK'}
pl = {'memberStateCode': 'PL', 'respondingAuthority': 'PL-GITD', 'statusCode': 'Timeout'}
ack_tech = '11111111-0000-4000-8000-000000000001'
def ack(technical, members):
    return json.loads(query('nu/apply-ack.sql', workflowId=wf, technicalId=technical, fromCountry='EU', memberStates=json.dumps(members)).stdout.strip())
assert ack(ack_tech, [de, pl])['status'] == 'acknowledged'
assert ack(ack_tech, [de, pl])['status'] == 'already_acknowledged', 'same technicalId'
assert ack('11111111-0000-4000-8000-000000000002', [de, pl])['status'] == 'already_acknowledged', 'identical content under a new technicalId'
pl_ok = dict(pl, statusCode='NotAvailable')
assert ack('11111111-0000-4000-8000-000000000003', [pl_ok])['status'] == 'acknowledged'
states = json.loads(sql("SELECT member_states FROM erru.nu_message WHERE nu_message_key=1 ORDER BY version DESC, id DESC LIMIT 1").stdout.strip())
assert [s['memberStateCode'] + ':' + s['statusCode'] for s in states] == ['DE:OK', 'PL:NotAvailable'], states
assert sql("SELECT status FROM erru.nu_message WHERE nu_message_key=1 ORDER BY version DESC, id DESC LIMIT 1").stdout.strip() == 'sent'
assert query('nu/apply-ack.sql', workflowId='00000000-0000-4000-8000-000000000000', technicalId=ack_tech, fromCountry='EU', memberStates=json.dumps([de])).stdout.strip() == ''
# A definite rejection ends in error; an uncertain outcome in send_unknown. Neither is sendable again.
for key, outcome, expected in ((2, 'rejected', 'error'), (3, 'unknown', 'send_unknown')):
    sql(f"""INSERT INTO erru.nu_message(nu_message_key,version,direction,status,business_case_id,nu_from,nu_to,originating_authority,request_source,request_purpose,
             unfit_start_date,tm_first_name,tm_family_name,tm_date_of_birth,tm_place_of_birth,source_good_repute_form_key,created_by)
           VALUES ({key},1,'outgoing','initiated','NU-T-{key}','EE','DE','EE-TRAM','CA','Control',current_date,'Mari','Maasikas','1980-05-01','Tallinn',10,'t')""")
    query('nu/begin-send.sql', key=key, expectedVersion=1, firstKey='MAR', familyKey='MASACAS', actor='t', actorName='T')
    assert json.loads(query('nu/mark-dispatch.sql', key=key, outcome=outcome, failure='x').stdout.strip())['status'] == expected
    assert json.loads(query('nu/begin-send.sql', key=key, expectedVersion=4, firstKey='MAR', familyKey='MASACAS', actor='t', actorName='T').stdout.strip()).get('code') == 'not_sendable'
# Late acknowledgements for an unknown-outcome message still complete it.
h3 = sql("SELECT workflow_id FROM erru.nu_message WHERE nu_message_key=3 ORDER BY version DESC LIMIT 1").stdout.strip()
r = json.loads(query('nu/apply-ack.sql', workflowId=h3, technicalId='11111111-0000-4000-8000-000000000009', fromCountry='EU', memberStates=json.dumps([de])).stdout.strip())
assert r['status'] == 'acknowledged'

# ── Guarded rollback ─────────────────────────────────────────────────────────
blocked = sql((changelog / '20261223100000-ncr-nu-outbound-xml-rollback.sql').read_text(), check=False)
assert blocked.returncode != 0 and 'requires the outbound XML lifecycle migration' in blocked.stderr, blocked.stderr
sql("DELETE FROM erru.xml_outbound_dispatch; DELETE FROM erru.nu_message WHERE status IN ('sending','send_unknown'); "
    "DELETE FROM erru.ncr_message WHERE status IN ('sending','send_unknown') OR response_technical_id IS NOT NULL;")
sql((changelog / '20261223100000-ncr-nu-outbound-xml-rollback.sql').read_text())
assert sql("SELECT to_regprocedure('erru.ncr_begin_send(text,text)') IS NULL AND to_regprocedure('erru.nu_apply_ack(uuid,uuid,text,jsonb)') IS NULL").stdout.strip() == 't'
print('PASS NCR/NU begin-send, response reservation, acknowledgement merge and replay, send_unknown, rejection, guarded rollback')
