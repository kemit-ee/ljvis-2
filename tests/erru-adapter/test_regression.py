#!/usr/bin/env python3
"""ERRU crash/deadline/protocol regression on an isolated, migrated CI stack.

python3 tests/erru-adapter/test_regression.py -- docker compose -f docker-compose.ci.yml -p ljvis-ci exec -T database psql -U ljvis -d ljvis_db
Creates only uniquely named ERRU-TEST business records. No table truncation.
"""
import json
import re
import subprocess
import sys
import time
import unittest
import urllib.error
import urllib.request
import uuid
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path

PSQL = sys.argv[sys.argv.index('--') + 1:] + ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1']
sys.argv = sys.argv[:1]
FIXTURES = Path(__file__).parent / 'fixtures'
ADAPTER = 'http://localhost:9091'
HUB = 'http://localhost:9092'
INTERNAL = 'http://localhost:9089/ljvis'
RESQL = 'http://localhost:9087/ljvis'
NS = {'e': 'https://webgate.ec.testa.eu/move-hub/erru/3.5'}
RESPONSE_PATH = '/erru/http/response/btshttpreceive.dll'


def sql(query):
    return subprocess.run(PSQL + ['-c', query], check=True, text=True, capture_output=True).stdout.strip()


def quoted(value):
    return "'" + str(value).replace("'", "''") + "'"


def http(url, body=None, xml=False):
    data = None if body is None else (body.encode() if xml else json.dumps(body).encode())
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/xml' if xml else 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            return response.status, response.read().decode()
    except urllib.error.HTTPError as response:
        return response.code, response.read().decode()


def fixture(kind):
    xml = (FIXTURES / (kind + '.xml')).read_text()
    ids = {'technicalId': str(uuid.uuid4()), 'workflowId': str(uuid.uuid4()), 'businessCaseId': 'ERRU-TEST-' + uuid.uuid4().hex[:20]}
    for key, value in ids.items():
        xml = re.sub(key + '="[^"]*"', key + '="' + value + '"', xml)
    json_file = FIXTURES / (kind + '.json')
    dto = json.loads(json_file.read_text()) if json_file.exists() else {}
    dto.update(ids)
    return xml, dto


def deadline(xml, seconds):
    value = (datetime.now(timezone.utc) + timedelta(seconds=seconds)).strftime('%Y-%m-%dT%H:%M:%SZ')
    return xml.replace('sentAt=', 'timeoutValue="' + value + '" sentAt=')


def accept(xml):
    status, body = http(ADAPTER + '/erru/xml', xml, True)
    assert status == 202, (status, body)
    return json.loads(body)['inboxId']


def await_outcome(inbox, completed=True, timeout=20):
    until = time.monotonic() + timeout
    while time.monotonic() < until:
        raw = sql(f"SELECT json_build_object('inbox',i.status,'outbox',o.status,'xml',o.xml_body,'deadline',o.deadline_at,'receivedBeforeDeadline',i.received_at<i.deadline_at) FROM erru.xml_inbox i JOIN erru.xml_outbox o ON o.inbox_id=i.id WHERE i.id={inbox}")
        if raw:
            result = json.loads(raw)
            if result['outbox'] in ('delivered', 'expired', 'failed') and (not completed or result['inbox'] == 'processed'):
                return result
        time.sleep(.1)
    raise AssertionError('Inbox did not reach expected outcome: ' + str(inbox) + ' ' + (raw or ''))


def xml_status(xml):
    return [element.attrib['statusCode'] for element in ET.fromstring(xml).iter() if 'statusCode' in element.attrib]


def seed(kind, dto):
    data = dict(dto)
    data[kind + 'From'] = data.pop('from')
    data['created_by'] = 'system'
    status, body = http(RESQL + '/erru/' + kind + '/append-inbound', data)
    assert status == 200 and len(json.loads(body)) == 1, (status, body)
    return json.loads(body)[0]['id']


def audit_count(kind, dto):
    return int(sql("SELECT count(*) FROM audit.audit_event WHERE event_type=" + quoted(kind + ('.inbound_request.store' if kind == 'nu' else '.inbound_request.serve')) + " AND log_content->>'businessCaseId'=" + quoted(dto['businessCaseId'])))


class ErruRegression(unittest.TestCase):
    def test_01_expired_and_short_deadline_notifications_finish(self):
        for kind in ('nu', 'ncr', 'rsi'):
            for seconds in (-30, 2):
                with self.subTest(kind=kind, seconds=seconds):
                    xml, dto = fixture(kind)
                    xml = deadline(xml, seconds)
                    inbox = accept(xml)
                    result = await_outcome(inbox)
                    if seconds < 0:
                        self.assertEqual('expired', result['outbox'])
                        self.assertEqual(404, http(HUB + '/_test/workflow/' + dto['workflowId'])[0])
                    else:
                        self.assertTrue(result['receivedBeforeDeadline'])
                    self.assertEqual(['OK'], xml_status(result['xml']))
                    self.assertEqual(1, audit_count(kind, dto))
                    self.assertEqual(inbox, accept(xml))
                    self.assertEqual(1, audit_count(kind, dto))
                    count = int(sql("SELECT count(*) FROM erru." + kind + "_message WHERE technical_id=" + quoted(dto['technicalId'])))
                    self.assertEqual(1 if kind == 'ncr' else 2, count)

    def test_02_crash_resume_and_concurrent_replay(self):
        for kind in ('nu', 'ncr', 'rsi'):
            with self.subTest(kind=kind):
                xml, dto = fixture(kind)
                key = seed(kind, dto)
                with ThreadPoolExecutor(4) as pool:
                    replies = list(pool.map(lambda _: http(INTERNAL + '/erru/' + kind + '/inbound-request', dto), range(4)))
                self.assertEqual([200] * 4, [status for status, _ in replies], replies)
                result = await_outcome(accept(xml))
                self.assertEqual(['OK'], xml_status(result['xml']))
                self.assertEqual(1, audit_count(kind, dto))
                self.assertEqual('1', sql('SELECT count(*) FROM notifications.notification WHERE event_key=' + quoted(dto['technicalId'])))
                if kind != 'rsi':
                    related = str(key) if kind == 'nu' else dto['businessCaseId']
                    count = int(sql("SELECT count(*) FROM notifications.notification WHERE related_entity_type=" + quoted(kind) + " AND related_entity_id=" + quoted(related)))
                    self.assertEqual(1, count)
                else:
                    self.assertEqual('2', sql("SELECT count(*) FROM erru.rsi_message WHERE technical_id=" + quoted(dto['technicalId'])))
                    self.assertEqual('answered', sql("SELECT status FROM erru.rsi_message WHERE technical_id=" + quoted(dto['technicalId']) + ' ORDER BY version DESC LIMIT 1'))

    def test_03_rsi_register_failure_is_not_not_found(self):
        xml, dto = fixture('rsi')
        dto['vehicleRegistrationNumber'] = 'EE-MOCK-502'
        status, body = http(INTERNAL + '/erru/rsi/inbound-request', dto)
        self.assertEqual(502, status, body)
        xml = xml.replace('vehicleRegistrationNumber="123ABC"', 'vehicleRegistrationNumber="EE-MOCK-502"')
        result = await_outcome(accept(deadline(xml, 3)), completed=False)
        self.assertEqual(['ServerError'], xml_status(result['xml']))
        self.assertNotEqual('processed', result['inbox'])
        self.assertEqual('received', sql("SELECT status FROM erru.rsi_message WHERE technical_id=" + quoted(dto['technicalId']) + ' ORDER BY version DESC LIMIT 1'))
        self.assertEqual(0, audit_count('rsi', dto))

    def test_04_cgr_partial_search_is_error_not_false_negative(self):
        for branch in ('7A', '7B'):
            xml, dto = fixture('cgr')
            element = 'TransportManagerCertificateDetails' if branch == '7A' else 'TransportManagerNameDetails'
            xml = re.sub('<' + element + r'[^>]*/>', '', xml)
            result = await_outcome(accept(xml))
            self.assertEqual(['ServerError'], xml_status(result['xml']))
            self.assertEqual('received', sql("SELECT status FROM erru.cgr_request WHERE technical_id=" + quoted(dto['technicalId']) + ' ORDER BY version DESC LIMIT 1'))
            root = ET.fromstring(result['xml'])
            self.assertEqual('ErrorNotification', root.tag.split('}')[-1])
            self.assertEqual(dto['workflowId'], root.find('e:Header', NS).get('workflowId'))

    def test_05_booleans_and_echo(self):
        for boolean in ('true', '1', ' true '):
            xml, _ = fixture('ctud')
            xml = re.sub('requestAllVehicles="[^"]*"', 'requestAllVehicles="' + boolean + '"', xml)
            result = await_outcome(accept(xml))
            self.assertEqual(['Found'], xml_status(result['xml']))
            root = ET.fromstring(result['xml'])
            self.assertEqual(3, len(root.findall('.//e:VehicleRegistrations/e:Vehicle', NS)))
        xml, _ = fixture('cgr')
        xml = re.sub(r'(<TransportManagerNameDetails[^>]*?)/>', r'\1><TransportManagerAddressDetails address="Test Street" postCode="10111" city="Tallinn" country="EE"/></TransportManagerNameDetails>', xml)
        self.assertIn('Test Street', await_outcome(accept(xml))['xml'])

    def test_06_wrong_recipient_and_strict_mock(self):
        xml, dto = fixture('nu')
        result = await_outcome(accept(xml.replace('to="EE"', 'to="FI"')))
        self.assertEqual(['InvalidData'], xml_status(result['xml']))
        en = result['xml']
        self.assertIn('to="EU"', en)
        self.assertEqual('0', sql("SELECT count(*) FROM erru.nu_message WHERE technical_id=" + quoted(dto['technicalId'])))
        en = en.replace('statusCode="InvalidData"', 'statusCode="Timeout"')
        self.assertEqual(200, http(HUB + RESPONSE_PATH, '<?xml version="1.0"?>' + en, True)[0])
        self.assertEqual(404, http(HUB + RESPONSE_PATH + '/wrong', en, True)[0])
        self.assertEqual(400, http(HUB + RESPONSE_PATH, 'not xml', True)[0])
        xml, _ = fixture('nu')
        ack = await_outcome(accept(xml))['xml']
        for quote in ('"', "'"):
            invalid = ack.replace('statusCode="OK"', 'statusCode=' + quote + 'NotAvailable' + quote)
            self.assertEqual(400, http(HUB + RESPONSE_PATH, invalid, True)[0])

    def test_07_slow_search_does_not_block_notification(self):
        xml, dto = fixture('cgr')
        xml = re.sub('certificateNumber="[^"]*"', 'certificateNumber="EE-CPC-SLOW"', xml)
        slow = accept(xml)
        time.sleep(.5)
        started = time.monotonic()
        nu, _ = fixture('nu')
        self.assertEqual('delivered', await_outcome(accept(nu), timeout=5)['outbox'])
        self.assertLess(time.monotonic() - started, 5)
        result = await_outcome(slow, timeout=12)
        self.assertEqual('delivered', result['outbox'])
        self.assertEqual(['ServerError'], xml_status(result['xml']))

    def test_08_manual_recovery_keeps_one_outbox(self):
        xml, dto = fixture('nu')
        inbox = accept(xml)
        result = await_outcome(inbox)
        self.assertEqual('delivered', result['outbox'])
        sql(f"UPDATE erru.xml_inbox SET status='failed', last_error='test manual recovery' WHERE id={inbox}")
        self.assertEqual(inbox, accept(xml))
        await_outcome(inbox)
        self.assertEqual('1', sql(f'SELECT count(*) FROM erru.xml_outbox WHERE inbox_id={inbox}'))
        self.assertEqual(1, audit_count('nu', dto))
        # Requeue a processed inbox's failed outbox without changing business state or XML.
        sql(f"UPDATE erru.xml_outbox SET status='failed' WHERE inbox_id={inbox}")
        sql(f"UPDATE erru.xml_outbox SET status='pending',attempts=0,next_attempt_at=NULL,claimed_by=NULL,lease_expires_at=NULL WHERE inbox_id={inbox} AND status='failed' AND deadline_at>now()")
        self.assertEqual('delivered', await_outcome(inbox)['outbox'])
        self.assertEqual(result['xml'], await_outcome(inbox)['xml'])

    def test_09_malformed_input_is_not_stored(self):
        xml, dto = fixture('nu')
        invalid = xml.replace('originatingAuthority="DE-BAG"', '')
        self.assertEqual(400, http(ADAPTER + '/erru/xml', invalid, True)[0])
        self.assertEqual('0', sql('SELECT count(*) FROM erru.xml_inbox WHERE technical_id=' + quoted(dto['technicalId'])))

    def test_10_audit_chain_survives_duplicate_writes(self):
        ordinary = "INSERT INTO audit.audit_event(event_id,event_type,event_category,description,created_by) VALUES (audit.generate_ulid(),'test.erru.boundary','system_process','ERRU verification boundary','test') RETURNING event_id"
        before = sql(ordinary)
        key = int(uuid.uuid4().int % 1000000000000) + 1
        stmt = "SELECT erru.record_inbound_audit('nu.inbound_request.store'," + str(key) + ",'test','{}'::jsonb)"
        with ThreadPoolExecutor(8) as pool:
            ids = list(pool.map(lambda _: sql(stmt), range(8)))
        self.assertEqual(1, len(set(ids)))
        self.assertRegex(ids[0], r'^[0-9A-HJKMNP-TV-Z]{26}$')
        self.assertEqual(ids[0], sql("SELECT event_id FROM erru.inbound_audit_key WHERE key=" + quoted('erru:nu.inbound_request.store:' + str(key))))
        after = sql(ordinary)
        # Exercise the same SQL endpoint used by /v1/logs/verify, including range filters.
        # A bounded range keeps older test fixtures outside this test's assertion.
        code, body = http(RESQL + '/log/get_logs_verify', {'from_event_id': before, 'to_event_id': after})
        self.assertEqual(200, code, body)
        verification = json.loads(body)[0]
        self.assertTrue(verification['ok'], verification)
        self.assertGreaterEqual(verification['checked'], 3)
        self.assertEqual(before, verification['fromEventId'])
        self.assertEqual(after, verification['toEventId'])
        code, body = http(RESQL + '/log/get_logs_verify', {'from_event_id': '', 'to_event_id': ''})
        self.assertEqual(200, code, body)
        self.assertTrue(json.loads(body)[0]['ok'], body)
        self.assertEqual('1', sql('SELECT count(*) FROM audit.audit_event WHERE event_id=' + quoted(ids[0])))
        row = json.loads(sql("SELECT json_build_object('previous',encode(prev_row_hash,'hex'),'hash',encode(row_hash,'hex'),'valid',row_hash=public.digest(event_id||event_type||created_at::text||coalesce(encode(actor_personal_code_hash,'hex'),'')||log_content::text||encode(prev_row_hash,'hex'),'sha256')) FROM audit.audit_event WHERE event_id=" + quoted(ids[0])))
        self.assertTrue(row['valid'])
        self.assertEqual('1', sql('SELECT count(*) FROM audit.chain_tip t WHERE EXISTS (SELECT 1 FROM audit.audit_event e WHERE e.row_hash=t.row_hash)'))
        self.assertEqual('0', sql("SELECT count(*) FROM audit.audit_event e WHERE e.prev_row_hash <> decode('00','hex') AND NOT EXISTS (SELECT 1 FROM audit.audit_event p WHERE p.row_hash=e.prev_row_hash)"))

    def test_10b_audit_order_for_distinct_concurrent_events(self):
        # A per-dedup-key lock alone cannot order different events. Exercise the shared
        # chain lock, normal writes and ERRU writes, plus a same-transaction burst.
        key = int(uuid.uuid4().int % 1000000000000) + 1
        normal = "INSERT INTO audit.audit_event(event_id,event_type,event_category,description,created_by) VALUES (audit.generate_ulid(),'test.erru.order','system_process','ERRU ordering regression','test')"
        statements = [normal if i % 2 else "SELECT erru.record_inbound_audit('nu.inbound_request.store'," + str(key + i) + ",'order test','{}'::jsonb)" for i in range(16)]
        with ThreadPoolExecutor(8) as pool:
            list(pool.map(sql, statements))
        sql("DO $$ BEGIN FOR i IN 1..32 LOOP " + normal + "; END LOOP; END $$;")
        code, body = http(RESQL + '/log/get_logs_verify', {'from_event_id': '', 'to_event_id': ''})
        self.assertEqual(200, code, body)
        self.assertTrue(json.loads(body)[0]['ok'], body)

    def test_11_recovery_after_audit_failure(self):
        for kind in ('nu', 'ncr'):
            xml, dto = fixture(kind)
            name = 'test_audit_failure_' + uuid.uuid4().hex[:12]
            sql("CREATE FUNCTION erru." + name + "() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected audit failure'; END $$; CREATE TRIGGER " + name + " BEFORE INSERT ON audit.audit_event FOR EACH ROW WHEN (NEW.log_content->>'businessCaseId'=" + quoted(dto['businessCaseId']) + ") EXECUTE FUNCTION erru." + name + "()")
            try:
                inbox = accept(deadline(xml, 3))
                failed = await_outcome(inbox, completed=False)
                self.assertNotEqual('processed', failed['inbox'])
                self.assertEqual(['ServerError'], xml_status(failed['xml']))
                self.assertEqual(0, audit_count(kind, dto))
            finally:
                sql('DROP TRIGGER ' + name + ' ON audit.audit_event; DROP FUNCTION erru.' + name + '()')
            recovered = await_outcome(inbox, timeout=20)
            self.assertEqual('processed', recovered['inbox'])
            self.assertEqual(1, audit_count(kind, dto))
            self.assertEqual('1', sql(f'SELECT count(*) FROM erru.xml_outbox WHERE inbox_id={inbox}'))
            self.assertEqual(failed['xml'], recovered['xml'])

    def test_12_slow_hub_delivery_is_deadline_bounded(self):
        xml, _ = fixture('nu')
        ack = await_outcome(accept(xml))['xml']
        tid, wid = str(uuid.uuid4()), str(uuid.uuid4())
        ack = re.sub('technicalId="[^"]*"', 'technicalId="' + tid + '"', ack)
        ack = re.sub('workflowId="[^"]*"', 'workflowId="' + wid + '"', ack)
        outbox = int(sql("INSERT INTO erru.xml_outbox(message_type,technical_id,workflow_id,destination,xml_body,deadline_at) VALUES ('NotifyUnfitness_Request'," + quoted(tid) + ',' + quoted(wid) + ',' + quoted('http://erru-hub-mock:8080' + RESPONSE_PATH + '?delayMs=12000') + ',' + quoted(ack) + ",now()+interval '2 seconds') RETURNING id"))
        started = time.monotonic()
        nu, _ = fixture('nu')
        self.assertEqual('delivered', await_outcome(accept(nu), timeout=5)['outbox'])
        while time.monotonic() - started < 5:
            status = sql('SELECT status FROM erru.xml_outbox WHERE id=' + str(outbox))
            if status == 'expired': break
            time.sleep(.1)
        self.assertEqual('expired', status)
        self.assertLess(time.monotonic() - started, 5)


    def test_13_ncr_all_results_use_event_keys(self):
        business_case = 'ERRU-TEST-' + uuid.uuid4().hex[:20]
        for expected_audits, (result, notification_type) in enumerate([('Fail', 'ncr_violation'), ('Pass', 'ncr_ok'), ('CleanCheck', 'ncr_ok')], 1):
            _, dto = fixture('ncr')
            dto['businessCaseId'] = business_case
            dto['checkResult'] = result
            for _ in range(2):
                status, body = http(INTERNAL + '/erru/ncr/inbound-request', dto)
                self.assertEqual(200, status, body)
            rows = json.loads(sql("SELECT coalesce(json_agg(type),'[]') FROM notifications.notification WHERE event_key=" + quoted(dto['technicalId'])))
            self.assertEqual([notification_type], rows)
            self.assertEqual(expected_audits, audit_count('ncr', dto))
        self.assertEqual('3', sql("SELECT count(*) FROM notifications.notification WHERE related_entity_type='ncr' AND related_entity_id=" + quoted(business_case)))

    def test_14_required_notification_failure_recovers(self):
        for kind, check_result in [('nu', None), ('ncr', 'Fail'), ('ncr', 'Pass'), ('ncr', 'CleanCheck'), ('rsi', None)]:
            with self.subTest(kind=kind, check_result=check_result):
                xml, dto = fixture(kind)
                if check_result:
                    dto['checkResult'] = check_result
                    xml = xml.replace('checkResult="Fail"', 'checkResult="' + check_result + '"')
                name = 'test_notification_failure_' + uuid.uuid4().hex[:12]
                sql("CREATE FUNCTION notifications." + name + "() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected notification failure'; END $$; CREATE TRIGGER " + name + " BEFORE INSERT ON notifications.notification FOR EACH ROW WHEN (NEW.event_key=" + quoted(dto['technicalId']) + ") EXECUTE FUNCTION notifications." + name + "()")
                try:
                    status, body = http(INTERNAL + '/erru/' + kind + '/inbound-request', dto)
                    self.assertEqual(502, status, body)
                    self.assertEqual(0, audit_count(kind, dto))
                    if kind == 'rsi':
                        self.assertEqual('received', sql("SELECT status FROM erru.rsi_message WHERE technical_id=" + quoted(dto['technicalId']) + ' ORDER BY version DESC LIMIT 1'))
                    inbox = accept(deadline(xml, 3))
                    failed = await_outcome(inbox, completed=False)
                    self.assertNotEqual('processed', failed['inbox'])
                    self.assertEqual(['ServerError'], xml_status(failed['xml']))
                finally:
                    sql('DROP TRIGGER ' + name + ' ON notifications.notification; DROP FUNCTION notifications.' + name + '()')
                self.assertEqual('processed', await_outcome(inbox, timeout=20)['inbox'])
                self.assertEqual('1', sql('SELECT count(*) FROM notifications.notification WHERE event_key=' + quoted(dto['technicalId'])))
                self.assertEqual(1, audit_count(kind, dto))
                self.assertEqual(200, http(INTERNAL + '/erru/' + kind + '/inbound-request', dto)[0])
                self.assertEqual('1', sql('SELECT count(*) FROM notifications.notification WHERE event_key=' + quoted(dto['technicalId'])))


if __name__ == '__main__':
    unittest.main(verbosity=2)
