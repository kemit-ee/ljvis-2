#!/usr/bin/env python3
"""SOAP adapters (DSL/Ruuter.internal/ljvis/POST/xroad/soap/*.yml) against misbehaving backends.

The real backends are Ruuter DSLs and always answer with JSON, so this test starts a temporary copy of the
ruuter-internal image whose LJVIS_RUUTER_INTERNAL points to a local mock. The mock returns JSON errors,
empty and text bodies, and successful bodies that violate the WSDL. Integration log rows are checked via psql.

python3 tests/xtr/bridge_test.py --image ljvis-ci-ruuter-internal --network ljvis-ci_ljvis-ci \
  -- docker compose -f docker-compose.ci.yml -p ljvis-ci exec -T database \
  psql -X -qAt -v ON_ERROR_STOP=1 -U ljvis -d ljvis_db
"""
import argparse
import json
import re
import subprocess
import tempfile
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ROW = {'kuupaev': '2026-06-15', 'nimetus': 'ti-2026-00001', 'asutus': 'OÜ Bridge', 'soiduki_reg_nr': '123ABC',
       'rikkumise_liik': 'x', 'kontrolli_nimetus': 'TOOINSPEKTION', 'juhi_nimi': 'Demo', 'juhi_perekonnanimi': 'Test',
       'rikkumised': '', 'rikkumised_lopetatud': ''}
YV_ROW = {'licence_plate_no': '123ABC', 'trailer_no': '', 'inspection_id': '1', 'inspection_no': 'X-1',
          'inspection_date': '2026-06-15', 'inspection_type': 'extraordinary_inspection', 'inspection_unit': 'PPA',
          'inspection_notes': '', 'inspector': 'Inspektor', 'issues': {'item': []}, 'notes': {'item': []},
          'inspection_refine_options': {'item': ['REGNR']}}

# Backend behaviour keyed by isikukood (IsikuKontroll) / alates (ErakorralineYVquery):
# (HTTP status, content type, body bytes)
CASES = {
    'json400': (400, 'application/json', json.dumps({'error': 'INVALID_PARAMETER', 'message': 'bad input'})),
    'json500': (500, 'application/json', json.dumps({'error': 'SERVER_ERROR', 'message': 'Internal error'})),
    'empty500': (500, 'application/json', ''),
    'text500': (500, 'text/plain', 'Internal Server Error'),
    'ok': (200, 'application/json', json.dumps({'kontrollid': {'item': [ROW]}})),
    'wrapped': (200, 'application/json', json.dumps({'response': json.dumps({'kontrollid': {'item': []}})})),
    'nodate': (200, 'application/json', json.dumps({'kontrollid': {'item': [dict(ROW, kuupaev=None)]}})),
    'text200': (200, 'text/plain', 'not json'),
    'empty200': (200, 'application/json', ''),
    'noroot': (200, 'application/json', '{}'),
    'yv-ok': (200, 'application/json', json.dumps({'targeted_for_inspection': {'item': [YV_ROW]}})),
    'yv-enum': (200, 'application/json', json.dumps({'targeted_for_inspection': {'item': [
        dict(YV_ROW, inspection_refine_options={'item': ['UNKNOWN']})]}})),
}


class Mock(BaseHTTPRequestHandler):
    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers.get('Content-Length') or 0)) or b'{}')
        case = body.get('isikukood') or body.get('alates')
        status, content_type, payload = CASES[case]
        data = payload.encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):
        pass


ENDPOINTS = {'IsikuKontroll': 'isiku-kontroll', 'IsikuEttevoteKontrollid': 'isiku-ettevote-kontrollid',
             'ErakorralineYVquery': 'erakorraline-yv-query'}


def post(url, body, message_id, client='ee-dev/GOV/70000310/ljvis-test'):
    headers = {'Content-Type': 'application/json', 'X-Road-Id': message_id}
    if client:
        headers['X-Road-Client'] = client
    request = urllib.request.Request(url, data=json.dumps(body).encode(), method='POST', headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, response.read().decode()
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode()


def unwrap(text):
    value = json.loads(text)
    if isinstance(value, dict) and 'response' in value:
        value = value['response']
    return json.loads(value) if isinstance(value, str) else value


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--image', required=True, help='ruuter-internal image of the test stack')
    parser.add_argument('--network', required=True, help='docker network of the test stack (resql-ljvis reachable)')
    parser.add_argument('db_command', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    db = args.db_command[1:] if args.db_command[:1] == ['--'] else args.db_command

    server = ThreadingHTTPServer(('0.0.0.0', 0), Mock)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    mock_port = server.server_address[1]

    constants = (ROOT / 'constants.ini').read_text()
    constants = re.sub(r'(?m)^LJVIS_RUUTER_INTERNAL=.*$', f'LJVIS_RUUTER_INTERNAL=http://host.docker.internal:{mock_port}/ljvis', constants)
    with tempfile.NamedTemporaryFile('w', suffix='.ini', delete=False) as handle:
        handle.write(constants)
    container = subprocess.check_output([
        'docker', 'run', '-d', '--rm', '--network', args.network, '--add-host', 'host.docker.internal:host-gateway',
        '-v', f'{ROOT}/DSL/Ruuter.internal/ljvis:/app/DSL/ljvis:ro', '-v', f'{handle.name}:/app/constants.ini:ro',
        '-v', f'{ROOT}/ruuter-internal.yaml:/app/ruuter.yaml:ro', '-p', '127.0.0.1::8080', args.image], text=True).strip()
    checks = []
    try:
        port = subprocess.check_output(['docker', 'port', container, '8080/tcp'], text=True).strip().splitlines()[0].rsplit(':', 1)[1]
        base = f'http://127.0.0.1:{port}/ljvis/xroad/soap/'
        for _ in range(60):
            try:
                urllib.request.urlopen(f'http://127.0.0.1:{port}/health', timeout=2)
                break
            except Exception:
                time.sleep(1)
        run_id = f'bridge-{time.time_ns()}'

        def call(case, operation='IsikuKontroll'):
            body = {'alates': case, 'kuni': '2026-12-31'} if operation == 'ErakorralineYVquery' else {'isikukood': case}
            status, text = post(base + ENDPOINTS[operation], body, f'{run_id}-{case}')
            return status, unwrap(text)

        def check(condition, message):
            if not condition:
                raise AssertionError(message)
            checks.append(message)

        status, _ = post(base + 'isiku-kontroll', {'isikukood': 'ok'}, f'{run_id}-noclient', client=None)
        check(status == 403, 'adapter path has its own X-Road-Client guard (403 without the header)')
        status, body = call('json400')
        check(status == 400 and body == json.loads(CASES['json400'][2]), 'backend 400 with JSON error body is passed through')
        status, body = call('json500')
        check(status == 500 and body['error'] == 'SERVER_ERROR', 'backend 500 with JSON error body is passed through')
        for case in ('empty500', 'text500'):
            status, body = call(case)
            check(status == 502 and body['error'] == 'BACKEND_ERROR', f'{case}: backend error without JSON body -> controlled 502 BACKEND_ERROR')
        status, body = call('ok')
        check(status == 200 and body['kontrollid']['item'][0]['kuupaev'] == '2026-06-15T00:00:00'
              and body['kontrollid']['item'][0]['soiduki_nimi'] == 'Demo', 'valid backend answer is converted to the WSDL shape')
        status, body = call('ok', 'IsikuEttevoteKontrollid')
        check(status == 200 and list(body) == ['Kontrollid'] and body['Kontrollid']['item'][0]['juhi_nimi'] == 'Demo'
              and body['Kontrollid']['item'][0]['ettevote_reg_nr'] == '', 'IsikuEttevoteKontrollid uses the WSDL root Kontrollid')
        status, body = call('wrapped')
        check(status == 200 and body == {'kontrollid': {'item': []}}, 'Ruuter {"response": "<json>"} wrapper is unwrapped')
        expectations = {'nodate': 'kuupaev is missing', 'text200': 'backend body is not JSON',
                        'empty200': 'backend body is not JSON', 'noroot': 'kontrollid is missing'}
        for case, reason in expectations.items():
            status, body = call(case)
            check(status == 502 and body['error'] == 'INVALID_BACKEND_RESPONSE' and reason in body['message'],
                  f'{case}: damaged successful answer -> 502 INVALID_BACKEND_RESPONSE ({reason}), no partial Success')
        status, body = call('yv-ok', 'ErakorralineYVquery')
        check(status == 200 and body['targeted_for_inspection']['item'][0]['inspection_refine_options']['item'] == ['Registreerimisnumber (A)'],
              'ErakorralineYVquery refine code is mapped to the WSDL enumeration')
        status, body = call('yv-enum', 'ErakorralineYVquery')
        check(status == 502 and 'outside the WSDL enumeration' in body['message'], 'unknown refine code is refused, not dropped')

        if db:
            logs = json.loads(subprocess.run(db + ['-qAt'], text=True, capture_output=True, check=True, input=f"""
                SELECT COALESCE(json_agg(t), '[]') FROM (SELECT request_xml, error_message, source_record_id
                FROM xroad.xroad_integration_log WHERE service_code LIKE 'xroad.soap.%' AND source_record_id LIKE '{run_id}-%') t;""").stdout)
            check(len(logs) == 7, f'each of the 7 bridge failures (2 without JSON body, 5 contract violations) is logged once ({len(logs)} rows)')
            check(all(re.fullmatch(r'operation=[A-Za-z]+&x-road-id=' + re.escape(run_id) + r'-[a-z0-9-]+', row['request_xml'])
                      and '{' not in row['error_message'] and 'Demo' not in json.dumps(row) for row in logs),
                  'log rows hold operation and X-Road id only, no request/response payload')
    finally:
        subprocess.run(['docker', 'rm', '-f', container], capture_output=True)
        server.shutdown()
        Path(handle.name).unlink(missing_ok=True)
    print(f'PASS: {len(checks)} checks')
    for message in checks:
        print('  ✓', message)


if __name__ == '__main__':
    main()
