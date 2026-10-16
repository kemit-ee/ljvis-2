#!/usr/bin/env python3
"""Test the built XTR image against synthetic upstream SOAP responses."""
import argparse
import json
from pathlib import Path
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import uuid


def docker(*args):
    return subprocess.check_output(['docker', *args], text=True).strip()


def request(url, data=None):
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        response = urllib.request.urlopen(req, timeout=10)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.status, response.read()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image', default='ljvis-ci-xtr-inbound')
    args = parser.parse_args()
    prefix = 'xtr-xml-' + uuid.uuid4().hex[:10]
    upstream, xtr = prefix + '-upstream', prefix + '-router'
    docker('network', 'create', prefix)
    try:
        with tempfile.TemporaryDirectory(prefix=prefix) as directory:
            root = Path(directory)
            root.chmod(0o755)
            dsl = root / 'DSL' / 'test'
            dsl.mkdir(parents=True)
            for mode in ['entities', 'fault', 'custom', 'escaped']:
                (dsl / (mode + '.yml')).write_text(
                    f'params: []\nmethod: POST\nservice: http://{upstream}:8000/{mode}\nenvelope: <request/>\n')
            (root / 'xtr.yaml').write_text('dsl_path: /test/DSL\nport: 8080\nxroad_instance: ee-test\n')
            (root / 'mock.py').write_text('''from http.server import BaseHTTPRequestHandler, HTTPServer
class Mock(BaseHTTPRequestHandler):
    def do_POST(self):
        self.rfile.read(int(self.headers.get('Content-Length', 0)))
        bodies = {
            '/entities': '<result>&quot;otsus&quot; &amp; &apos;alus&apos; &lt;2026&gt;</result>',
            '/escaped': '<result>&amp;quot; &amp;custom;</result>',
            '/custom': '<result>&custom;</result>',
            '/fault': '<soap:Fault><faultcode>soap:Server</faultcode><faultstring>Invalid &quot;case&quot; &amp; reference</faultstring></soap:Fault>'
        }
        body = ('<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>' + bodies[self.path] + '</soap:Body></soap:Envelope>').encode()
        self.send_response(200)
        self.send_header('Content-Type', 'text/xml; charset=utf-8')
        self.end_headers()
        self.wfile.write(body)
HTTPServer(('0.0.0.0', 8000), Mock).serve_forever()
''')
            docker('run', '-d', '--name', upstream, '--network', prefix,
                   '-v', f'{root}:/test:ro', 'python:3.12-alpine', 'python', '/test/mock.py')
            docker('exec', upstream, 'python', '-c',
                   'import socket,time\n'
                   'for _ in range(100):\n'
                   ' try:\n'
                   '  socket.create_connection(("127.0.0.1",8000),timeout=1).close(); break\n'
                   ' except OSError: time.sleep(0.1)\n'
                   'else: raise SystemExit("SOAP mock did not start")')
            docker('run', '-d', '--name', xtr, '--network', prefix,
                   '-p', '127.0.0.1::8080', '-v', f'{root}:/test:ro',
                   '-v', f'{root}/xtr.yaml:/app/xtr.yaml:ro', args.image)
            port = docker('port', xtr, '8080/tcp').rsplit(':', 1)[1]
            base = 'http://127.0.0.1:' + port
            for _ in range(60):
                try:
                    if request(base + '/health')[0] == 200:
                        break
                except (OSError, urllib.error.URLError):
                    pass
                time.sleep(0.5)
            else:
                raise AssertionError('XTR did not become healthy: ' + docker('logs', xtr))
            status, raw = request(base + '/test/entities', b'{}')
            body = json.loads(raw)
            assert status == 200 and body['body']['result'] == '\"otsus\" & \'alus\' <2026>', (status, body)
            status, raw = request(base + '/test/escaped', b'{}')
            body = json.loads(raw)
            assert status == 200 and body['body']['result'] == '&quot; &custom;', (status, body)
            status, raw = request(base + '/test/fault', b'{}')
            body = json.loads(raw)
            assert status == 502 and body['error'] == 'upstream_soap_fault', (status, body)
            assert body['string'] == 'Invalid \"case\" & reference', body
            status, raw = request(base + '/test/custom', b'{}')
            body = json.loads(raw)
            assert status == 502 and body['error'] == 'upstream_xml_parse_error', (status, body)
            print('PASS: built XTR decodes standard entities once, preserves spaces, reports SOAP faults, and rejects custom entities')
    finally:
        subprocess.run(['docker', 'rm', '-f', xtr, upstream], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(['docker', 'network', 'rm', prefix], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


if __name__ == '__main__':
    main()
