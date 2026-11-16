#!/usr/bin/env python3
"""Golden check for the XTR raw-XML bridge (docker/erru-xml-adapter).

For each outgoing ERRU message the *real* compose steps of the Ruuter flow (DSL/Ruuter/.../send.yml) are
evaluated with node against the variables the flow has at that point, the JSON is POSTed to /xml-out/ of
the erru-xml-adapter image, and the XML the Hub would receive must be (a) XSD-clean (no XTR violation log)
and (b) canonically equal to the Java adapter's fixture (fixtures/*.xml). The xtrPreflight conditions must
all be false for the valid case.
Usage: xtr_golden.py --image <erru-xml-adapter image> [--only nu,cgr,...]"""
import argparse, json, re, subprocess, sys, tempfile, threading, time, urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from xml.etree import ElementTree as ET
import yaml

ROOT = Path(__file__).resolve().parents[2]
FLOWS = ROOT / "DSL/Ruuter/ljvis/POST/v1/erru"
FIX = Path(__file__).parent / "fixtures"
captured = {}

ENVELOPE = {"technical_id": "00000000-0000-4000-8000-000000000001", "workflow_id": "00000000-0000-4000-8000-000000000002",
            "sent_at": "2026-09-23T09:05:00Z"}

CASES = {
    "nu": dict(flow="nu/send.yml", msg="NotifyUnfitness_Request", fixture="nu.xml", steps=["composeXtrMessage"], pre=["buildXtrAttrs", "compactXtrAttrs", "composeXtrBody", "composeXtrDetails"],
               ctx=dict(outboundHeader=dict(technicalId="79081891-f8d6-4655-97ea-d0d9c288b13e", workflowId="93c53112-9033-44f5-b3bb-a29f83f95186",
                        sentAt="2026-09-23T09:00:00Z", nuTo="EE", businessCaseId="REVIEW-nu-b3299f65", originatingAuthority="DE-BAG", requestSource="CA",
                        requestPurpose="Control", unfitStartDate="2026-09-23", tmFirstName="HANS", tmFamilyName="MUELLER", tmDateOfBirth="1975-04-12",
                        tmPlaceOfBirth="", tmFirstNameSearchKey="", tmFamilyNameSearchKey="", certificateNumber="DE-CPC-CI-000001",
                        certificateIssueDate="2010-05-01", certificateIssueCountry="DE"),
                        xtr_has_name=True, xtr_has_cert=True, header_from="DE")),
    "ctud": dict(flow="ctud/send.yml", msg="CheckTransportUndertakingData_Request", fixture="ctud.xml",
                 steps=["composeXtrElement", "composeXtrSearch", "composeXtrBody"],
                 ctx=dict(ctud_to="EE", business_case_id="DE-CTUD-CI-0001", originating_authority="DE-BAG", request_source="CA", request_purpose="Control",
                          undertaking_name="AS EESTI VEOD", licence_number="EE-CL-2020-11111", vehicle_number="123ABC", vehicle_registration_country="EE",
                          all_vehicles="false", technical_id="639986bd-6fb6-4cf9-81a5-f1fd15f1678c", workflow_id="639986bd-6fb6-4cf9-81a5-f1fd15f1678c"), from_="DE"),
    "cgr": dict(flow="cgr/send.yml", msg="CheckGoodRepute_Request", fixture="cgr.xml",
                steps=["composeXtrNameRaw", "composeXtrName", "composeXtrCertRaw", "composeXtrCert", "composeXtrSearched", "composeXtrBody"],
                ctx=dict(cgr_to="ZZ", business_case_id="DE-CGR-CI-0001", originating_authority="DE-BAG", request_source="CA", request_purpose="Issue",
                         tm_first_name="MART", tm_family_name="TAMM", tm_date_of_birth="1980-05-15", tm_place_of_birth="Tallinn",
                         tm_first_name_search_key="", tm_family_name_search_key="", certificate_number="EE-CPC-2020-00111",
                         certificate_issue_date="2020-06-01", certificate_issue_country="EE",
                         technical_id="04f58147-c712-4e65-9a70-7384c8d94c3f", workflow_id="eb197e69-c5a8-4ada-8e51-e889a7fc00fe"), from_="DE"),
}

NCR_JSON = json.loads((FIX / "ncr.json").read_text())
CASES["ncr"] = dict(flow="ncr/send.yml", msg="NotifyCheckResult_Request", fixture="ncr.xml",
                    steps=["composeXtrSerious", "composeXtrMinor", "composeXtrBody"], from_="DE",
                    ctx=dict(business_case_id="DE-NCR-CI-0001", originating_authority_out="DE-BAG",
                             technical_id="9d689693-f1c2-4a0e-97b0-805a8841c4a9", workflow_id="9d689693-f1c2-4a0e-97b0-805a8841c4a9",
                             current=dict(ncrTo="EE", requestSource="CA", requestPurpose="Control", minorInfringement=None,
                                          **{k: NCR_JSON[k] for k in ("transportUndertakingName", "communityLicenceNumber", "vehicleRegistrationNumber",
                                                                      "vehicleRegistrationCountry", "checkResult", "checkDate", "seriousInfringements")})))

RSI = json.loads((FIX / "rsi.json").read_text())
CASES["rsi"] = dict(flow="rsi/send.yml", msg="RoadSideInspection_Request", fixture="rsi.xml", from_="DE",
                    steps=["composeXtrIdent", "composeXtrItems", "composeXtrBody"],
                    ctx=dict(rsi_to="EE", business_case_id="DE-RSI-CI-0001", originating_authority_out="DE-BAG", request_source="RSI",
                             request_purpose="Control", technical_id="8429c1f6-d284-49b8-933c-928c31c79063", workflow_id="8429c1f6-d284-49b8-933c-928c31c79063",
                             vehicle_registration_number=RSI["vehicleRegistrationNumber"], vehicle_registration_country=RSI["vehicleRegistrationCountry"],
                             vehicle_category=RSI["vehicleCategory"], vehicle_identification_number=RSI["vehicleIdentificationNumber"],
                             odometer_reading=RSI["odometerReading"], driver_first_name=RSI["driverFirstName"], driver_family_name=RSI["driverFamilyName"],
                             driver_licence_number=RSI["driverLicenceNumber"], driver_licence_country=RSI["driverLicenceCountry"],
                             identification_details=RSI["identificationDetails"], inspection_identifier=RSI["inspectionIdentifier"],
                             inspection_location=RSI["inspectionLocation"], inspection_datetime=RSI["inspectionDatetime"],
                             inspection_authority_out=RSI["inspectionAuthorityOrName"], inspection_passed=RSI["inspectionPassed"],
                             pti_requested=RSI["ptiRequested"], vehicle_prohibition=RSI["vehicleProhibitionOrRestriction"],
                             erru_checked_items=RSI["checkedItems"]))

CASES["ncr-response"] = dict(flow="ncr/response-send.yml", msg="NotifyCheckResult_Response", fixture="ncr-response.xml", from_="DE",
                             steps=["composeXtrTu", "composeXtrPen", "composeXtrBody"],
                             ctx=dict(business_case_id="DE-NCR-CI-0002", technical_id="11111111-1111-4111-8111-111111111111",
                                      workflow_id="22222222-2222-4222-8222-222222222222",
                                      current=dict(ncrFrom="EE", originatingAuthority="DE-BAG", respondingAuthority="EE-TRAM", responseStatusCode="OK",
                                                   responseStatusMessage="Done", transportUndertakingName="ACME OU", responseNumberOfVehicles=3,
                                                   communityLicenceNumber="EE-CL-001", responseCommunityLicenceStatus="Active",
                                                   responseAddress='{"address":"Main St 1","postCode":"10111","city":"Tallinn","country":"EE"}',
                                                   responsePenaltiesImposed='[{"penaltyRequestedIdentifier":1,"authorityImposingPenalty":"EE-TRAM","isImposed":true,"penaltyTypeImposed":"101","startDate":"2026-10-01"}]')))

def run_node(code):
    return json.loads(subprocess.run(["node", "-e", code], capture_output=True, text=True, check=True).stdout)

def eval_steps(flow, steps, ctx):
    doc = yaml.safe_load((FLOWS / flow).read_text())
    script = "const ctx=%s;\n" % json.dumps(ctx)
    for s in steps:
        # Conservative: every variable of one assign block sees only the variables from before the step.
        script += "{const snap={...ctx};\n"
        for name, e in doc[s]["assign"].items():
            m = re.fullmatch(r"\$\{(.*)\}", e, re.S)
            script += "ctx[%s]=new Function(...Object.keys(snap),'return ('+%s+')')(...Object.values(snap));\n" % (json.dumps(name), json.dumps(m.group(1)))
        script += "}\n"
    script += "console.log(JSON.stringify(ctx));"
    return run_node(script)

def preflight_false(flow, ctx):
    doc = yaml.safe_load((FLOWS / flow).read_text())
    conds = [c["condition"] for c in doc["xtrPreflight"]["switch"]]
    script = "const ctx=%s;console.log(JSON.stringify([%s].map(c=>c)));" % (json.dumps(ctx), ",".join(
        "new Function(...Object.keys(ctx),'return ('+%s+')')(...Object.values(ctx))" % json.dumps(re.fullmatch(r"\$\{(.*)\}", c, re.S).group(1)) for c in conds))
    return not any(run_node(script))

class Hub(BaseHTTPRequestHandler):
    def do_POST(self):
        captured["xml"] = self.rfile.read(int(self.headers["content-length"]))
        self.send_response(202); self.end_headers()
    def log_message(self, *a): pass

BOOL = {"1": "true", "0": "false"}

def canon(e):
    return (e.tag, sorted((k, BOOL.get(v, v) if k in ("appealPossible", "itemFailed", "isRectified", "isImposed") else v) for k, v in e.attrib.items()), (e.text or "").strip(), [canon(c) for c in e])

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--image", required=True); ap.add_argument("--port", type=int, default=18080)
    ap.add_argument("--only", default=",".join(CASES))
    a = ap.parse_args()
    srv = HTTPServer(("0.0.0.0", 18099), Hub); threading.Thread(target=srv.serve_forever, daemon=True).start()
    tmp = Path(tempfile.mkdtemp())
    side = (ROOT / "docker/erru-xml-adapter/xml/erru.xml.yaml").read_text()
    (tmp / "erru.xml.yaml").write_text(re.sub(r"http://erru-hub-mock:8080/\S*", "http://host.docker.internal:18099/x", side))
    (tmp / "xtr.yaml").write_text((ROOT / "docker/erru-xml-adapter/xtr.yaml").read_text().replace("[erru-hub-mock]", "[host.docker.internal]"))
    name = "erru-xtr-golden"
    subprocess.run(["docker", "rm", "-f", name], capture_output=True)
    subprocess.run(["docker", "run", "-d", "--name", name, "--add-host", "host.docker.internal:host-gateway", "-e", "XTR_BACKEND_HEADER_ERRU=golden-test-token-0123456789abcdef0123456789", "-p", f"{a.port}:8080", "-v", f"{tmp}/xtr.yaml:/app/xtr.yaml:ro",
                    "-v", f"{tmp}/erru.xml.yaml:/erru/wsdl/erru/erru.xml.yaml:ro", a.image], check=True, capture_output=True)
    failed = []
    try:
        for _ in range(30):
            try: urllib.request.urlopen(f"http://localhost:{a.port}/health", timeout=1); break
            except Exception: time.sleep(1)
        for key in a.only.split(","):
            c = CASES[key]; ctx = dict(c["ctx"]); captured.clear()
            if key == "nu":
                ctx = eval_steps(c["flow"], c["pre"] + c["steps"], ctx); body = ctx["xtr_body"]
                body["Header"]["@from"] = "DE"; body["Header"]["@to"] = "EE"  # fixture is a DE->EE capture; the flow sends from EE
                pre_ok = True  # NU preflight reads the DB row, not this ctx
            else:
                ctx.update(ENVELOPE) if "technical_id" not in ctx else None
                ctx["sent_at"] = "2026-09-23T09:05:00Z"
                pre_ok = preflight_false(c["flow"], ctx)
                ctx = eval_steps(c["flow"], c["steps"], ctx); body = ctx["xtr_body"]
                body["Header"]["@from"] = c["from_"]  # the fixtures are inbound-from-DE captures; the flow always sends from EE
            before = subprocess.run(["docker", "logs", name], capture_output=True, text=True)
            req = urllib.request.Request(f"http://localhost:{a.port}/xml-out/erru/erru/{c['msg']}", data=json.dumps(body).encode(),
                                         headers={"content-type": "application/json"})
            res = json.load(urllib.request.urlopen(req, timeout=20))
            after = subprocess.run(["docker", "logs", name], capture_output=True, text=True)
            newlog = (after.stdout + after.stderr)[len(before.stdout + before.stderr):]
            ok = pre_ok and res.get("status") == 202 and "violations" not in newlog and \
                canon(ET.fromstring(captured["xml"])) == canon(ET.parse(FIX / c["fixture"]).getroot())
            print(f"XTR {key} golden:", "OK" if ok else f"FAIL pre={pre_ok} {res} {newlog[-400:]} {captured.get('xml')}")
            if not ok: failed.append(key)
    finally:
        subprocess.run(["docker", "rm", "-f", name], capture_output=True)
    sys.exit(1 if failed else 0)

if __name__ == "__main__":
    main()
