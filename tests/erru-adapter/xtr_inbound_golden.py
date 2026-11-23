#!/usr/bin/env python3
"""Parity check for the XTR inbound path of the one-way ERRU messages (docker/erru-xml-adapter).

Each fixtures/inbound/<name>.xml is POSTed to the image's /erru/xml alias with `inbound.backend` pointing at a capture
server. The `request` JSON XTR hands its backend is fed to the real `mapBody` expression of
DSL/Ruuter.internal/.../erru/xtr/inbound/<Message>.yml (evaluated with node); the result must equal
fixtures/inbound/<name>.expected.json, the body the Java adapter's *Mapper.requestToJson built for the same XML
(generated with tests/erru-adapter/MapperDump.java). JSON-in-string fields are compared as parsed JSON.
Usage: xtr_inbound_golden.py --image <erru-xml-adapter image>"""
import argparse, json, re, subprocess, sys, tempfile, threading, time, urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[2]
FLOWS = ROOT / "DSL/Ruuter.internal/ljvis/POST/erru/xtr/inbound"
FIX = Path(__file__).parent / "fixtures/inbound"
got = {}

class Backend(BaseHTTPRequestHandler):
    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["content-length"])))
        got[self.path.rsplit("/", 1)[1]] = body
        self.send_response(202); self.end_headers()
    def log_message(self, *a): pass

def unwrap(v):
    """Strings holding JSON are compared as JSON (key order inside them is irrelevant)."""
    if isinstance(v, dict): return {k: unwrap(x) for k, x in v.items()}
    if isinstance(v, list): return [unwrap(x) for x in v]
    if isinstance(v, str) and v[:1] in "[{":
        try: return unwrap(json.loads(v))
        except ValueError: return v
    return v

def map_body(message, request):
    doc = yaml.safe_load((FLOWS / f"{message}.yml").read_text())
    e = re.fullmatch(r"\$\{(.*)\}", doc["mapBody"]["assign"]["inbound_body"], re.S).group(1)
    script = "const xtr_req=%s; console.log(JSON.stringify(%s));" % (json.dumps(request), e)
    return json.loads(subprocess.run(["node", "-e", script], capture_output=True, text=True, check=True).stdout)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--image", required=True); ap.add_argument("--port", type=int, default=18081)
    a = ap.parse_args()
    srv = HTTPServer(("0.0.0.0", 18098), Backend); threading.Thread(target=srv.serve_forever, daemon=True).start()
    tmp = Path(tempfile.mkdtemp())
    side = (ROOT / "docker/erru-xml-adapter/xml/erru.xml.yaml").read_text()
    # The sidecar already routes the one-way messages to inbound.backend; only point it at the capture server.
    side = re.sub(r"  backend: http://ruuter-internal\S*", "  backend: http://host.docker.internal:18098/in", side, count=1)
    assert "host.docker.internal:18098" in side
    side = re.sub(r"http://erru-hub-mock:8080/\S*", "http://host.docker.internal:18099/x", side)
    (tmp / "erru.xml.yaml").write_text(side)
    (tmp / "xtr.yaml").write_text((ROOT / "docker/erru-xml-adapter/xtr.yaml").read_text().replace("[erru-hub-mock]", "[host.docker.internal]"))
    name = "erru-xtr-inbound-golden"
    subprocess.run(["docker", "rm", "-f", name], capture_output=True)
    subprocess.run(["docker", "run", "-d", "--name", name, "--add-host", "host.docker.internal:host-gateway", "-e", "XTR_BACKEND_HEADER_ERRU=golden-test-token-0123456789abcdef0123456789", "-p", f"{a.port}:8081",
                    "-v", f"{tmp}/xtr.yaml:/app/xtr.yaml:ro", "-v", f"{tmp}/erru.xml.yaml:/erru/wsdl/erru/erru.xml.yaml:ro", a.image],
                   check=True, capture_output=True)
    failed = []
    try:
        for _ in range(30):
            try: urllib.request.urlopen(f"http://localhost:{a.port}/health", timeout=1); break
            except Exception: time.sleep(1)
        for xml in sorted(FIX.glob("*.xml")):
            got.clear()
            req = urllib.request.Request(f"http://localhost:{a.port}/erru/xml", data=xml.read_bytes(), headers={"content-type": "application/xml"})
            status = urllib.request.urlopen(req, timeout=10).status
            (message, body), = got.items()
            actual = unwrap(map_body(message, body["request"]))
            expected = unwrap(json.loads(xml.with_suffix(".expected.json").read_text()))
            ok = status == 202 and actual == expected
            print(f"XTR inbound {xml.stem}:", "OK" if ok else f"FAIL\n  expected {json.dumps(expected)}\n  actual   {json.dumps(actual)}")
            if not ok: failed.append(xml.stem)
    finally:
        subprocess.run(["docker", "rm", "-f", name], capture_output=True)
    sys.exit(1 if failed else 0)

if __name__ == "__main__":
    main()
