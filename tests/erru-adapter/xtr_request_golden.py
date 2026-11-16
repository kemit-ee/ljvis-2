#!/usr/bin/env python3
"""Parity check for the XTR inbound *request* path (docker/erru-xml-adapter, stage 5, NU first).

1. fixtures/requests/<name>-request.xml is POSTed to the image's /erru/xml alias (inbound.backend = capture server); the
   `request` JSON XTR hands the backend goes through the real `mapBody` expression of
   DSL/Ruuter.internal/.../erru/xtr/inbound/<Message>.yml and must equal <name>-request.expected.json (the body of the
   Java adapter's requestToJson).
2. The flow's real `buildAnswer` / `buildEn` expressions are evaluated for typical flow answers and POSTed to /xml-out/ of the
   image; the XML the Hub would receive must be XSD-clean (no XTR violation log) and canonically equal to the expected XML.
Usage: xtr_request_golden.py --image <erru-xml-adapter image>"""
import argparse, json, re, subprocess, sys, tempfile, threading, time, urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from xml.etree import ElementTree as ET
import yaml

ROOT = Path(__file__).resolve().parents[2]
FLOWS = ROOT / "DSL/Ruuter.internal/ljvis/POST/erru/xtr/inbound"
FIX = Path(__file__).parent / "fixtures/requests"
state = {}

class Backend(BaseHTTPRequestHandler):
    def do_POST(self):
        state["backend"] = json.loads(self.rfile.read(int(self.headers["content-length"])))
        self.send_response(202); self.end_headers()
    def log_message(self, *a): pass

class Hub(BaseHTTPRequestHandler):
    def do_POST(self):
        state["xml"] = self.rfile.read(int(self.headers["content-length"]))
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

def eval_steps(message, steps, ctx):
    worker = FLOWS.parent / "worker" / f"{message}.yml"   # asynchronously answered types keep their processing steps there
    doc = yaml.safe_load((worker if worker.exists() else FLOWS / f"{message}.yml").read_text())
    script = "const ctx=%s;\n" % json.dumps(ctx)
    for s in steps:
        script += "{const snap={...ctx};\n"
        for name, e in doc[s]["assign"].items():
            m = re.fullmatch(r"\$\{(.*)\}", e, re.S)
            script += "ctx[%s]=new Function(...Object.keys(snap),'return ('+%s+')')(...Object.values(snap));\n" % (json.dumps(name), json.dumps(re.sub(r"\[#ERRU_RESPONDING_AUTHORITY(_\w+)?\]", lambda mo: "EE-PPA" if not mo.group(1) else "EE-TRAM", m.group(1))))
        script += "}\n"
    script += "console.log(JSON.stringify(ctx));"
    return json.loads(subprocess.run(["node", "-e", script], capture_output=True, text=True, check=True).stdout)

def canon(e, drop_sent=False):
    attrs = sorted((k, v) for k, v in e.attrib.items() if not (drop_sent and k == "sentAt"))
    return (e.tag, attrs, (e.text or "").strip(), [canon(c, drop_sent) for c in e])

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--image", required=True); ap.add_argument("--port", type=int, default=18082)
    a = ap.parse_args()
    threading.Thread(target=HTTPServer(("0.0.0.0", 18098), Backend).serve_forever, daemon=True).start()
    threading.Thread(target=HTTPServer(("0.0.0.0", 18099), Hub).serve_forever, daemon=True).start()
    tmp = Path(tempfile.mkdtemp())
    side = (ROOT / "docker/erru-xml-adapter/xml/erru.xml.yaml").read_text()
    side = re.sub(r"  backend: http://ruuter-internal\S*", "  backend: http://host.docker.internal:18098/in", side, count=1)
    side = re.sub(r"http://erru-hub-mock:8080/\S*", "http://host.docker.internal:18099/x", side)
    (tmp / "erru.xml.yaml").write_text(side)
    (tmp / "xtr.yaml").write_text((ROOT / "docker/erru-xml-adapter/xtr.yaml").read_text().replace("[erru-hub-mock]", "[host.docker.internal]"))
    name = "erru-xtr-request-golden"
    subprocess.run(["docker", "rm", "-f", name], capture_output=True)
    subprocess.run(["docker", "run", "-d", "--name", name, "--add-host", "host.docker.internal:host-gateway", "-e", "XTR_BACKEND_HEADER_ERRU=golden-test-token-0123456789abcdef0123456789",
                    "-p", f"{a.port}:8080", "-p", f"{a.port + 1}:8081", "-v", f"{tmp}/xtr.yaml:/app/xtr.yaml:ro", "-v", f"{tmp}/erru.xml.yaml:/erru/wsdl/erru/erru.xml.yaml:ro", a.image],
                   check=True, capture_output=True)
    failed = []
    try:
        for _ in range(30):
            try: urllib.request.urlopen(f"http://localhost:{a.port + 1}/health", timeout=1); break
            except Exception: time.sleep(1)
        # 1. request mapping (every <fixture>.xml has a Java-derived <fixture>.expected.json)
        mappings = [("NotifyUnfitness_Request", "nu-request"), ("NotifyCheckResult_Request", "ncr-request"),
                    ("RoadSideInspection_Request", "rsi-request"), ("RoadSideInspection_Request", "rsi-holder-request"),
                    ("CheckGoodRepute_Request", "cgr-request"), ("CheckTransportUndertakingData_Request", "ctud-request"),
                    ("CheckTransportUndertakingData_Request", "ctud-namevehicle-request")]
        requests = {}
        for msg, fx in mappings:
            state.clear()
            req = urllib.request.Request(f"http://localhost:{a.port + 1}/erru/xml", data=(FIX / f"{fx}.xml").read_bytes(), headers={"content-type": "application/xml"})
            status = urllib.request.urlopen(req, timeout=10).status
            request = requests[fx] = state["backend"]["request"]
            ctx = eval_steps(msg, ["extractHeader"], {"xtr_req": request, "accepted": {"receivedAt": "2026-11-16T09:00:05Z"}})
            ctx = eval_steps(msg, ["mapBody"], ctx)
            actual, expected = unwrap(ctx["inbound_body"]), unwrap(json.loads((FIX / f"{fx}.expected.json").read_text()))
            ok = status == 202 and actual == expected
            print(f"XTR request {fx} mapping:", "OK" if ok else f"FAIL\n  expected {json.dumps(expected)}\n  actual   {json.dumps(actual)}")
            if not ok: failed.append(fx)
        # 1b. recipient check (the Java adapter let a CGR broadcast, to="ZZ", through; everything else must be addressed to EE)
        def wrong_recipient(msg, to):
            doc = yaml.safe_load(((FLOWS.parent / "worker" / f"{msg}.yml") if (FLOWS.parent / "worker" / f"{msg}.yml").exists() else (FLOWS / f"{msg}.yml")).read_text())
            cond = next(c["condition"] for c in doc["decideAccepted"]["switch"] if "to_state" in c["condition"])
            expr = re.fullmatch(r"\$\{(.*)\}", cond, re.S).group(1)
            return json.loads(subprocess.run(["node", "-e", "const to_state=%s; console.log(JSON.stringify(!!(%s)))" % (json.dumps(to), expr)], capture_output=True, text=True, check=True).stdout)
        for msg, to, want in [("CheckGoodRepute_Request", "ZZ", False), ("CheckGoodRepute_Request", "EE", False), ("CheckGoodRepute_Request", "DE", True),
                              ("CheckTransportUndertakingData_Request", "ZZ", True), ("NotifyUnfitness_Request", "ZZ", True), ("RoadSideInspection_Request", "EE", False)]:
            got = wrong_recipient(msg, to)
            print(f"XTR request recipient {msg} to={to} wrong={got}:", "OK" if got == want else "FAIL")
            if got != want: failed.append(f"to-{msg}-{to}")
        # 2. answers / ErrorNotification
        def common_for(fx):
            r = requests[fx]
            return {"xtr_req": r, "hdr": r["Header"], "bdy": r["Body"], "workflow_id": r["Header"]["@workflowId"],
                    "from_state": "DE", "business_case_id": r["Body"]["@businessCaseId"], "raw_xml": "RAW",
                    "accepted": {"inboxId": 7, "responseTechnicalId": "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa", "errorTechnicalId": "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb"}}
        nu, ncr, rsi = common_for("nu-request"), common_for("ncr-request"), common_for("rsi-request")
        ack = {"acknowledgementType": "NotifyUnfitness_Acknowledgement", "workflowId": "93c53112-9033-44f5-b3bb-a29f83f95186", "businessCaseId": "REVIEW-nu-b3299f65",
               "originatingAuthority": "DE-BAG", "to": "DE", "sentAt": "2026-11-16T09:00:00Z",
               "memberStates": [{"memberStateCode": "EE", "respondingAuthority": "EE-PPA", "statusCode": "OK", "statusMessage": ""}]}
        cases = [("nu ack (memberStates)", "NotifyUnfitness_Request", "buildAnswer", "answer_body", {**nu, "inbound_json": ack}, "NotifyUnfitness_Acknowledgement", "nu-ack-memberstates.expected.xml", False),
                 ("nu ack (flat)", "NotifyUnfitness_Request", "buildAnswer", "answer_body", {**nu, "inbound_json": {"acknowledgementType": "NotifyUnfitness_Acknowledgement", "statusCode": "OK", "statusMessage": ""}}, "NotifyUnfitness_Acknowledgement", "nu-ack-flat.expected.xml", True),
                 ("nu error notification", "NotifyUnfitness_Request", "buildEn", "en_body", {**nu, "en_status": "InvalidData", "en_message": "Request is not addressed to this member state"}, "ErrorNotification", "error-notification.expected.xml", True),
                 ("nu error notification (whitespace + escaping)", "NotifyUnfitness_Request", "buildEn", "en_body", {**nu, "en_status": "InvalidData", "en_message": "  bad\n\t value   here \"x\" & <y> ", "raw_xml": '<a x="1">&amp; & </a>'}, "ErrorNotification", "error-notification-escape.expected.xml", True),
                 ("ncr ack", "NotifyCheckResult_Request", "buildAnswer", "answer_body", {**ncr, "inbound_json": {"acknowledgementType": "NCRN_Ack", "statusCode": "OK", "statusMessage": "Recorded", "sentAt": "2026-11-16T09:00:00Z"}}, "NotifyCheckResult_Acknowledgement", "ncr-ack.expected.xml", False),
                 ("rsi response OK", "RoadSideInspection_Request", "buildAnswer", "answer_body", {**rsi, "inbound_json": {"statusCode": "OK", "statusMessage": ""}}, "RoadSideInspection_Response", "rsi-response-ok.expected.xml", True),
                 ("rsi response NotFound", "RoadSideInspection_Request", "buildAnswer", "answer_body", {**rsi, "inbound_json": {"statusCode": "NotFound", "statusMessage": "Vehicle not registered"}}, "RoadSideInspection_Response", "rsi-response-notfound.expected.xml", True)]
        cgr, ctud = common_for("cgr-request"), common_for("ctud-request")
        for label, msg, base, out_msg in [("cgr found", "CheckGoodRepute_Request", cgr, "CheckGoodRepute_Response"), ("cgr notfound", "CheckGoodRepute_Request", cgr, "CheckGoodRepute_Response"),
                                          ("ctud found", "CheckTransportUndertakingData_Request", ctud, "CheckTransportUndertakingData_Response"),
                                          ("ctud notfound", "CheckTransportUndertakingData_Request", ctud, "CheckTransportUndertakingData_Response")]:
            stem = label.replace(" ", "-")
            cases.append((label, msg, "buildAnswer", "answer_body", {**base, "inbound_json": json.loads((FIX / f"{stem}.answer.json").read_text())}, out_msg, f"{stem}.expected.xml", True))
        # a Found record that cannot be translated completely must not produce an answer (-> ErrorNotification ServerError)
        for stem, msg, base in [("cgr-untranslatable", "CheckGoodRepute_Request", cgr), ("ctud-untranslatable", "CheckTransportUndertakingData_Request", ctud)]:
            body = eval_steps(msg, ["buildAnswer"], {**base, "inbound_json": json.loads((FIX / f"{stem}.answer.json").read_text())})["answer_body"]
            print(f"XTR request {stem} (no answer built):", "OK" if body is None else f"FAIL {body}")
            if body is not None: failed.append(stem)
        for label, msg, step, var, c, out_msg, expected_file, drop_sent in cases:
            state.pop("xml", None)
            body = eval_steps(msg, [step], c)[var]
            before = subprocess.run(["docker", "logs", name], capture_output=True, text=True)
            req = urllib.request.Request(f"http://localhost:{a.port}/xml-out/erru/erru/{out_msg}", data=json.dumps(body).encode(), headers={"content-type": "application/json"})
            res = json.load(urllib.request.urlopen(req, timeout=20))
            after = subprocess.run(["docker", "logs", name], capture_output=True, text=True)
            newlog = (after.stdout + after.stderr)[len(before.stdout + before.stderr):]
            exp = (FIX / expected_file).read_text().strip()
            ok = res.get("status") == 202 and "violations" not in newlog and canon(ET.fromstring(state["xml"]), drop_sent) == canon(ET.fromstring(exp), drop_sent)
            print(f"XTR request {label}:", "OK" if ok else f"FAIL {res} {newlog[-400:]}\n  got {state.get('xml')}")
            if not ok: failed.append(label)
    finally:
        subprocess.run(["docker", "rm", "-f", name], capture_output=True)
    sys.exit(1 if failed else 0)

if __name__ == "__main__":
    main()
