#!/usr/bin/env python3
"""Run the real adapter against a disposable database and local HTTP peers."""
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import xml.etree.ElementTree as ET

if os.environ.get('ERRU_DISPOSABLE_DATABASE') != '1':
    raise RuntimeError('Use run-integration-tests.sh')
container = sys.argv[1]
root = Path(__file__).resolve().parents[2]
fixtures = Path(__file__).parent / 'fixtures'
modes, calls, deliveries = {}, {}, {}


def sql(query):
    return subprocess.check_output(['docker', 'exec', container, 'psql', '-U', 'postgres', '-d',
                                    'erru_adapter_test', '-XqAt', '-v', 'ON_ERROR_STOP=1', '-c', query], text=True).strip()


def await_value(query, expected, timeout=15):
    end = time.monotonic() + timeout
    actual = None
    while time.monotonic() < end:
        actual = sql(query)
        if actual == expected:
            return actual
        time.sleep(.05)
    raise AssertionError((query, expected, actual))


class Peer(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_POST(self):
        raw = self.rfile.read(int(self.headers['Content-Length']))
        if self.path == '/hub':
            doc = ET.fromstring(raw)
            body = next(e for e in doc if e.tag.endswith('Body'))
            case = body.get('businessCaseId')
            deliveries.setdefault(case, []).append(raw)
            mode = modes.get(case, 'ok')
            status = {'hub-reject': 400, 'hub-retry': 503, 'hub-redirect': 302}.get(mode, 202)
            self.send_response(status)
            self.end_headers()
            return
        assert self.headers['x-internal-service-token'] == 'synthetic-token'
        data = json.loads(raw)
        case = data.get('businessCaseId', data.get('workflowId'))
        calls[case] = calls.get(case, 0) + 1
        mode = modes.get(case, 'ok')
        status, answer = 200, {'statusCode': 'OK'}
        if self.path.endswith('/inbound-response'):
            answer = {'status': 'responded'}
        elif '/cgr/' in self.path or '/ctud/' in self.path:
            answer = {'statusCode': 'NotFound'}
        elif '/nu/' in self.path:
            answer = {'acknowledgementType': 'NotifyUnfitness_Acknowledgement', 'statusCode': 'OK'}
        elif '/ncr/' in self.path:
            answer = {'acknowledgementType': 'NCRN_Ack', 'statusCode': 'OK'}
        if mode == 'transient':
            status, answer = 503, {'error': 'synthetic outage'}
        elif mode == 'permanent':
            answer = {'unexpected': True}
        elif mode == 'invalid-data':
            answer = {'statusCode': 'InvalidData'}
        elif mode == 'invalid-json':
            answer = None
        elif mode == 'envelope':
            answer = {'response': answer}
        elif mode == 'string-envelope':
            answer = {'response': json.dumps(answer)}
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'not-json' if answer is None else json.dumps(answer).encode())


peer = ThreadingHTTPServer(('127.0.0.1', 0), Peer)
threading.Thread(target=peer.serve_forever, daemon=True).start()
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
base = f'http://127.0.0.1:{port}'
peer_url = f'http://127.0.0.1:{peer.server_port}'
env = dict(os.environ, PORT=str(port), RUUTER_INTERNAL_BASE_URL=peer_url,
           HUB_RESPONSE_URL=peer_url + '/hub', POLL_INTERVAL_MS='30',
           CONTRACTS_DIR=str(root / 'contracts/erru/3.5'))
args = ['java', '-ea']
if env.get('JACOCO_AGENT'):
    args.append(f"-javaagent:{env['JACOCO_AGENT']}=destfile={env['JACOCO_EXEC']},append=true")
args += ['-classpath', env['JAVA_TEST_OUTPUT_DIR'] + '/classes' + os.pathsep +
         str(root / 'docker/erru-xml-adapter/lib/postgresql-42.7.4.jar'), 'ErruXmlAdapter']
log_path = Path(env['JAVA_TEST_OUTPUT_DIR']) / 'transport.log'


def http(path, body=None):
    data = None if body is None else body.encode()
    request = urllib.request.Request(base + path, data=data, headers={'Content-Type': 'application/xml'})
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return response.status, response.read().decode()
    except urllib.error.HTTPError as response:
        return response.code, response.read().decode()


def accept(kind='rsi', mode='ok', seconds=60, recipient='EE'):
    text = (fixtures / (kind + '.xml')).read_text()
    case = 'ERRU-TEST-' + uuid.uuid4().hex[:20]
    for name, value in [('technicalId', str(uuid.uuid4())), ('workflowId', str(uuid.uuid4())), ('businessCaseId', case)]:
        text = re.sub(name + '="[^"]*"', name + '="' + value + '"', text)
    deadline = (datetime.now(timezone.utc) + timedelta(seconds=seconds)).strftime('%Y-%m-%dT%H:%M:%SZ')
    text = text.replace('sentAt=', f'timeoutValue="{deadline}" sentAt=').replace('to="EE"', f'to="{recipient}"')
    modes[case] = mode
    code, body = http('/erru/xml', text)
    assert code == 202, (code, body)
    return json.loads(body)['inboxId'], case, text


with log_path.open('w') as log:
    process = subprocess.Popen(args, env=env, stdout=log, stderr=log)
    try:
        for _ in range(200):
            try:
                if http('/health')[0] == 200:
                    break
            except (OSError, urllib.error.URLError):
                pass
            if process.poll() is not None:
                raise AssertionError(log_path.read_text())
            time.sleep(.05)
        else:
            raise AssertionError('Adapter did not become healthy')
        for kind, mode in [('rsi', 'ok'), ('nu', 'ok'), ('ncr', 'ok'), ('cgr', 'envelope'), ('ctud', 'string-envelope')]:
            inbox, case, text = accept(kind, mode)
            await_value(f'SELECT status FROM erru.xml_inbox WHERE id={inbox}', 'processed')
            await_value(f'SELECT status FROM erru.xml_outbox WHERE inbox_id={inbox}', 'delivered')
            assert len(deliveries[case]) == 1
            assert http('/erru/xml', text)[0] == 202
            changed_case = case[:-1] + ('a' if case[-1] != 'a' else 'b')
            conflict = text.replace(case, changed_case)
            conflict_result = http('/erru/xml', conflict)
            assert conflict_result[0] == 409, conflict_result
            assert calls[case] == 1
        # Transient processing is retried; no business completion or outbox before recovery.
        inbox, case, _ = accept(mode='transient')
        await_value(f"SELECT (status='received' AND attempts>0 AND next_attempt_at IS NOT NULL)::text FROM erru.xml_inbox WHERE id={inbox}", 'true')
        assert sql(f'SELECT count(*) FROM erru.xml_outbox WHERE inbox_id={inbox}') == '0'
        modes[case] = 'ok'
        sql(f"UPDATE erru.xml_inbox SET next_attempt_at=now() WHERE id={inbox}")
        await_value(f'SELECT status FROM erru.xml_inbox WHERE id={inbox}', 'processed')
        assert calls[case] >= 2
        # Requests with no business side effect can complete with an ErrorNotification.
        for mode in ['permanent', 'invalid-json']:
            inbox, case, _ = accept('cgr', mode)
            await_value(f'SELECT status FROM erru.xml_inbox WHERE id={inbox}', 'processed')
            assert 'ErrorNotification' in sql(f'SELECT xml_body FROM erru.xml_outbox WHERE inbox_id={inbox}')
        inbox, _, _ = accept(recipient='FI')
        await_value(f'SELECT status FROM erru.xml_inbox WHERE id={inbox}', 'processed')
        assert 'InvalidData' in sql(f'SELECT xml_body FROM erru.xml_outbox WHERE inbox_id={inbox}')
        inbox, _, _ = accept('cgr', seconds=-10)
        await_value(f'SELECT status FROM erru.xml_outbox WHERE inbox_id={inbox}', 'expired')
        for mode in ['hub-reject', 'hub-retry', 'hub-redirect']:
            inbox, case, _ = accept(mode=mode)
            expected = 'failed' if mode == 'hub-reject' else 'pending'
            await_value(f'SELECT status FROM erru.xml_outbox WHERE inbox_id={inbox}', expected)
            if mode != 'hub-reject':
                await_value(f"SELECT (status='pending' AND attempts>0 AND next_attempt_at IS NOT NULL)::text FROM erru.xml_outbox WHERE inbox_id={inbox}", 'true')
                modes[case] = 'ok'
                sql(f'UPDATE erru.xml_outbox SET next_attempt_at=now() WHERE inbox_id={inbox}')
                await_value(f'SELECT status FROM erru.xml_outbox WHERE inbox_id={inbox}', 'delivered')
                assert len(deliveries[case]) == 2
                assert deliveries[case][0] == deliveries[case][1], 'Retry changed the persisted XML'
        # Health reports a failed database rather than accepting new messages as durable.
        subprocess.run(['docker', 'stop', container], check=True, stdout=subprocess.DEVNULL)
        assert http('/health')[0] == 503
        code, body = http('/erru/xml', text.replace(case, 'ERRU-TEST-DB-DOWN'))
        assert code == 500, (code, body)
        print('PASS real ingress, five request types, replay/conflict, processing retry, permanent errors, expiry, delivery retry/rejection, health and database failure')
    finally:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
        peer.shutdown()
        peer.server_close()
