#!/usr/bin/env python3
"""Run RSI migration and concurrency checks on a disposable PostgreSQL container.
Usage: python3 tests/erru-adapter/test_rsi_outbound.py CONTAINER
The container must have an empty rsi_test database. Never use a shared database.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import re
import subprocess
import sys

container = sys.argv[1]
root = Path(__file__).resolve().parents[2]

def sql(statement, check=True):
    result = subprocess.run(['docker', 'exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'rsi_test', '-XqAt', '-v', 'ON_ERROR_STOP=1'], input=statement, text=True, capture_output=True, check=False)
    if check and result.returncode:
        raise AssertionError(result.stderr)
    return result

sql('''CREATE SCHEMA classifier;
CREATE SEQUENCE classifier.seq_classifier_value_key;
CREATE TABLE classifier.classifier(id bigserial, classifier_key bigint, code text, created_at timestamptz DEFAULT now());
CREATE TABLE classifier.classifier_value(classifier_value_key bigint, classifier_key bigint, code text, name text, valid_from date, created_by text);
INSERT INTO classifier.classifier(classifier_key,code) VALUES (1,'RSI_REQUEST_STATUS');''')
sql((root / 'DSL/Liquibase/changelog/20260814100000-initial-erru-rsi.sql').read_text())
sql((root / 'DSL/Liquibase/changelog/20261201085000-erru-inbound-business-recovery.sql').read_text())
migration = (root / 'DSL/Liquibase/changelog/20261021182827-rsi-outbound-xml.sql').read_text()
sql(migration)
sql(migration)
assert sql("SELECT count(*) FROM classifier.classifier_value").stdout.strip() == '2'

def seed(key):
    sql(f"INSERT INTO erru.rsi_message(rsi_message_key,version,direction,status,business_case_id,rsi_from,rsi_to) VALUES ({key},1,'outgoing','initiated','EE-RSI-TEST-{key}','EE','EE')")

def transition(key, state):
    query = (root / 'DSL/Resql/ljvis/POST/erru/rsi/append-transition.sql').read_text()
    values = {'key': str(key), 'newStatus': "'" + state + "'", 'responseStatusCode': "'OK'", 'responseStatusMessage': "''", 'errorMessage': "'test'", 'created_by': "'test'"}
    query = re.sub(r'(?<!:):([a-zA-Z][a-zA-Z0-9_]*)', lambda m: values[m[1]], query)
    return sql(query)

seed(1)
with ThreadPoolExecutor(2) as pool:
    results = list(pool.map(lambda _: sql("SELECT count(*) FROM erru.rsi_begin_send(1,1,'test')").stdout.strip(), range(2)))
assert sorted(results) == ['0', '1'], results
assert sql("SELECT status||':'||version FROM erru.rsi_message WHERE rsi_message_key=1 ORDER BY version DESC LIMIT 1").stdout.strip() == 'sending:2'
ids = sql("SELECT technical_id||':'||workflow_id FROM erru.rsi_message WHERE rsi_message_key=1 AND status='sending'").stdout.strip()
assert all(ids.split(':'))
# A stale editor cannot append its old draft after the reservation.
failure = sql("INSERT INTO erru.rsi_message(rsi_message_key,version,direction,status,business_case_id) VALUES (1,2,'outgoing','initiated','stale')", check=False)
assert failure.returncode != 0 and 'Concurrent RSI revision' in failure.stderr
transition(1, 'sent')
assert ids == sql("SELECT technical_id||':'||workflow_id FROM erru.rsi_message WHERE rsi_message_key=1 AND status='sent'").stdout.strip()
transition(1, 'responded')
assert not transition(1, 'sent').stdout.strip()
seed(2)
sql("SELECT count(*) FROM erru.rsi_begin_send(2,1,'test')")
# A callback can win the race against the HTTP acceptance result.
transition(2, 'responded')
assert not transition(2, 'sent').stdout.strip()
seed(3)
sql("SELECT count(*) FROM erru.rsi_begin_send(3,1,'test')")
transition(3, 'send_unknown')
assert sql("SELECT count(*) FROM erru.rsi_begin_send(3,3,'test')").stdout.strip() == '0'
transition(3, 'responded')
assert sql("SELECT status FROM erru.rsi_message WHERE rsi_message_key=3 ORDER BY version DESC LIMIT 1").stdout.strip() == 'responded'
# An incoming redelivery still uses ON CONFLICT DO NOTHING, not the outgoing snapshot guard.
sql("INSERT INTO erru.rsi_message(rsi_message_key,version,direction,status,business_case_id,technical_id) VALUES (4,1,'incoming','received','incoming','11111111-1111-1111-1111-111111111111')")
sql("INSERT INTO erru.rsi_message(rsi_message_key,version,direction,status,business_case_id,technical_id) VALUES (4,1,'incoming','received','incoming','11111111-1111-1111-1111-111111111111') ON CONFLICT (technical_id) WHERE direction='incoming' AND status='received' DO NOTHING")
print('PASS idempotent migration, parallel reservation, stale-edit rejection, persisted envelope, early callback, uncertain send, incoming replay')
