#!/usr/bin/env python3
"""Exercise the real adapter process, PostgreSQL journal, Hub HTTP and async response worker.
Run test_rsi_outbound.py first on the same disposable container.
Usage: python3 tests/erru-adapter/test_rsi_transport.py CONTAINER CLASSES_DIR
"""
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

root = Path(__file__).resolve().parents[2]
container, classes = sys.argv[1:3]

def sql(query):
    r = subprocess.run(['docker','exec','-i',container,'psql','-U','postgres','-d','rsi_test','-XqAt','-v','ON_ERROR_STOP=1'], input=query,text=True,capture_output=True)
    assert r.returncode == 0, r.stderr
    return r.stdout.strip()

sql((root/'DSL/Liquibase/changelog/20261201090000-initial-erru-xml-inbox-outbox.sql').read_text())
received = []
callbacks = []
class Peer(BaseHTTPRequestHandler):
    def do_POST(self):
        body = self.rfile.read(int(self.headers['Content-Length']))
        if self.path == '/hub/rsi':
            assert self.headers['Content-Type'].startswith('application/xml')
            received.append(body)
            self.send_response(202); self.end_headers()
        elif self.path == '/ljvis/erru/rsi/inbound-response':
            assert self.headers['x-internal-service-token'] == 'rsi-test-token'
            callbacks.append(json.loads(body))
            self.send_response(200); self.send_header('Content-Type','application/json');self.end_headers()
            self.wfile.write(b'{"status":"responded"}')
        else:
            self.send_response(404);self.end_headers()
    def log_message(self, *args): pass
peer = ThreadingHTTPServer(('127.0.0.1',0), Peer)
threading.Thread(target=peer.serve_forever,daemon=True).start()
with socket.socket() as s:
    s.bind(('127.0.0.1',0)); port = s.getsockname()[1]
base = f'http://127.0.0.1:{port}'
peer_url = f'http://127.0.0.1:{peer.server_port}'
env = dict(os.environ, PORT=str(port), DB_URL='jdbc:postgresql://127.0.0.1:55439/rsi_test',DB_USER='postgres',DB_PASSWORD='test',
 RUUTER_INTERNAL_BASE_URL=peer_url,INTERNAL_COMMUNICATION_KEY='rsi-test-token',HUB_RESPONSE_URL=peer_url+'/hub/response',
 HUB_RSI_REQUEST_URL=peer_url+'/hub/rsi',CONTRACTS_DIR=str(root/'contracts/erru/3.5'),MEMBER_STATE_CODE='EE',
 RESPONDING_AUTHORITY='EE-PPA',RESPONDING_AUTHORITY_CTUD='EE-TRAM',RESPONDING_AUTHORITY_RSI='EE-TRAM',RESPONDING_AUTHORITY_NCR='EE-TRAM',POLL_INTERVAL_MS='100')
process = subprocess.Popen(['java','-cp', classes+os.pathsep+str(root/'docker/erru-xml-adapter/lib/postgresql-42.7.4.jar'),'ErruXmlAdapter'],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
def http(path, body=None, xml=False):
    data = None if body is None else body.encode() if xml else json.dumps(body).encode()
    req = urllib.request.Request(base+path,data=data,headers={'Content-Type':'application/xml' if xml else 'application/json','x-internal-service-token':'rsi-test-token'})
    try:
        with urllib.request.urlopen(req,timeout=5) as r:return r.status,r.read().decode()
    except urllib.error.HTTPError as r:return r.code,r.read().decode()
def until(check):
    end=time.monotonic()+12
    while time.monotonic()<end:
        assert process.poll() is None, 'Adapter process stopped'
        try:
            result=check()
            if result:return result
        except (OSError,urllib.error.URLError):pass
        time.sleep(.1)
    raise AssertionError('Adapter condition timed out')
try:
    until(lambda:http('/health')[0]==200)
    dto=json.loads((root/'tests/erru-adapter/fixtures/rsi.json').read_text())
    dto.update(technicalId=str(uuid.uuid4()),workflowId=str(uuid.uuid4()),businessCaseId='EE-RSI-TRANSPORT-TEST',rsiTo='EE')
    assert http('/internal/rsi/validate',dto)[0]==200
    assert received==[]
    status,raw=http('/internal/rsi/send',dto)
    assert status==200 and json.loads(raw)['status']=='accepted',(status,raw)
    assert len(received)==1
    assert http('/internal/rsi/send',dto)[0]==200
    assert len(received)==1,'Persistent replay resent the request'
    conflict=dict(dto,inspectionLocation='Different location')
    assert http('/internal/rsi/send',conflict)[0]==409
    # Concurrent requests share one durable claim even across handler threads.
    from concurrent.futures import ThreadPoolExecutor
    parallel=dict(dto,technicalId=str(uuid.uuid4()),workflowId=str(uuid.uuid4()))
    with ThreadPoolExecutor(2) as pool:
        results=list(pool.map(lambda _:http('/internal/rsi/send',parallel),range(2)))
    assert all(r[0]==200 for r in results),results
    assert len(received)==2,'Concurrent calls dispatched twice'
    # Receive the business response over the same ingress used by the sTESTA gateway.
    tid=str(uuid.uuid4())
    response=f'''<RoadSideInspection_Response xmlns="https://webgate.ec.testa.eu/move-hub/erru/3.5">
    <Header version="3.5" technicalId="{tid}" workflowId="{dto['workflowId']}" from="EE" to="EE" sentAt="2026-10-21T15:00:00Z"/>
    <Body businessCaseId="{dto['businessCaseId']}" originatingAuthority="TEST" respondingAuthority="EE-TRAM" statusCode="OK"/>
    </RoadSideInspection_Response>'''
    status,raw=http('/erru/xml',response,True)
    assert status==202,(status,raw)
    inbox=json.loads(raw)['inboxId']
    until(lambda:sql(f'SELECT status FROM erru.xml_inbox WHERE id={inbox}')=='processed')
    assert callbacks==[{'workflowId':dto['workflowId'],'responseStatusCode':'OK','responseStatusMessage':''}],callbacks
    assert sql(f'SELECT count(*) FROM erru.xml_outbox WHERE inbox_id={inbox}')=='0','Response generated another response'
    assert http('/erru/xml',response,True)[0]==202
    assert len(callbacks)==1,'Completed response was processed twice'
    assert sql("SELECT count(*) FROM erru.xml_rsi_dispatch WHERE status='accepted'")=='2'
    print('PASS real adapter + PostgreSQL + Hub: validate, XML/202, durable replay, parallel claim, conflict, async callback, no response loop')
finally:
    process.terminate()
    try:process.wait(timeout=5)
    except subprocess.TimeoutExpired:process.kill();process.wait()
    peer.shutdown();peer.server_close()
