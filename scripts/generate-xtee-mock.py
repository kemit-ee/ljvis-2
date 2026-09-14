#!/usr/bin/env python3
"""Regenerate the synthetic sandbox and artifacts from the real provider workflows.

Only the nine explicitly listed provider routes are copied. All outbound HTTP steps
become in-memory synthetic responses. Run --check in CI to detect contract drift.
No database, secrets, or remote services are accessed by this generator.
"""
import json
from pathlib import Path
import re
import sys

import yaml

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "DSL/Ruuter.internal/ljvis"
DEST = ROOT / "DSL/Ruuter/xtee-mock"
DOCS = ROOT / "docs/developer"
SUCCESS_PERSON = "60001019906"
EMPTY_PERSON = "60001019907"
CLIENT = "ee-dev/GOV/70001490/liiklusregister"
DENIED_CLIENT = "ee-dev/GOV/70000000/denied"
check = "--check" in sys.argv
drift = []


def emit(path, value):
    if not isinstance(value, str):
        value = yaml.safe_dump(value, allow_unicode=True, sort_keys=False, width=110)
    if check:
        if not path.exists() or path.read_text() != value:
            drift.append(str(path.relative_to(ROOT)))
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(value)


def json_text(value):
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def expression(value):
    return "${" + value + "}"


def adapt_runtime(value):
    """Use the pinned engine's query interface and return JSON without its wrapper."""
    if isinstance(value, dict):
        result = {k: adapt_runtime(v) for k, v in value.items()}
        if "return" in result:
            result["wrapper"] = False
            returned = result["return"]
            if isinstance(returned, str) and returned.startswith("${"):
                result["return"] = expression("JSON.parse(" + returned[2:-1] + ")")
            elif isinstance(returned, str) and returned.startswith("{"):
                result["return"] = json.loads(returned)
        return result
    if isinstance(value, list):
        return [adapt_runtime(v) for v in value]
    if isinstance(value, str):
        return value.replace("incoming.query.", "incoming.params.")
    return value


def response_expr(rows, predicate="true"):
    return expression("incoming.headers['x-mock-scenario'] === 'empty' || !(" + predicate + ") ? [] : " + json.dumps(rows))


def schema(value):
    if value is None:
        return {"type": "string", "nullable": True}
    if isinstance(value, bool):
        return {"type": "boolean"}
    if isinstance(value, int):
        return {"type": "integer"}
    if isinstance(value, str):
        return {"type": "string"}
    if isinstance(value, list):
        items = {}
        for item in value:
            items = merge_schema(items, schema(item))
        return {"type": "array", "items": items}
    return {"type": "object", "properties": {k: schema(v) for k, v in value.items()},
            "required": list(value), "additionalProperties": False}


def merge_schema(left, right):
    if not right:
        return left
    if not left:
        return right
    result = dict(left)
    if right.get("nullable"):
        result["nullable"] = True
    if result.get("type") == "object":
        properties = dict(result["properties"])
        for key, value in right["properties"].items():
            properties[key] = merge_schema(properties.get(key, {}), value)
        result["properties"] = properties
        result["required"] = [k for k in result["required"] if k in right["required"]]
    elif result.get("type") == "array":
        result["items"] = merge_schema(result["items"], right["items"])
    return result


fields = ["kuupaev", "nimetus", "asutus", "soiduki_reg_nr", "rikkumise_liik", "kontrolli_nimetus",
          "juhi_nimi", "juhi_perekonnanimi", "rikkumised", "rikkumised_lopetatud"]
person_rows = [dict(zip(fields, ["2026-06-15", "MOCK-KV-001", "Mockvedaja OÜ", "MOCK123",
                               "extraordinary_inspection", "KOONDVORM", "Test", "Juht", None, None])),
               dict(zip(fields, ["2026-06-14", "MOCK-TI-002", "Mockvedaja OÜ", None, None,
                                 "TOOINSPEKTION", "Test", "Juht", None, "Mock lõpetamine"]))]
company_rows = [dict(row, ettevote_reg_nr="00000001") for row in person_rows]
target_rows = [
    {"licence_plate_no": "MOCK123", "trailer_no": None, "inspection_id": "900001",
     "inspection_no": "MOCK-KV-001", "inspection_date": "2026-06-15",
     "inspection_type": "extraordinary_inspection", "inspection_unit": "Mockvedaja OÜ",
     "inspection_notes": "Sünteetiline näidiskontroll", "inspector": None,
     "issues_json": '[{"partCode":"B01","defectCode":"defect_minor"}]',
     "era_yv_mnt_regnr": True, "era_yv_mnt_vintin": True, "era_yv_mnt_axles": True,
     "era_yv_mnt_places": True, "era_yv_mnt_rebuilt": True},
    {"licence_plate_no": "MOCK456", "trailer_no": None, "inspection_id": "900002",
     "inspection_no": "MOCK-KV-002", "inspection_date": "2026-06-14",
     "inspection_type": "extraordinary_inspection_ta", "inspection_unit": "Mockvedaja OÜ",
     "inspection_notes": None, "inspector": None, "issues_json": "[]"},
]
usage_rows = [
    {"logtime": "2026-06-15T12:00:00Z", "action": "Mock kontrollipäring",
     "receiver_code": "70001490", "receiver_name": "Mock tarbija", "receiver_system": "liiklusregister"},
    {"logtime": "2026-06-14T12:00:00Z", "action": "Mock töökontroll",
     "receiver_code": "70001969", "receiver_name": "", "receiver_system": ""},
    {"logtime": "2026-06-13T12:00:00Z", "action": "Mock korduspäring",
     "receiver_code": "70001490", "receiver_name": "Mock tarbija", "receiver_system": "liiklusregister"},
]
job = {"kontrollija": "Mock Kontrollija", "kontrolli_id": 900001, "kontrolli_kp": "2026-06-15",
       "tooandja_nimi": "Mockvedaja OÜ", "tooandja_reg_kood": "00000001", "soidukite_arv": 2,
       "koostatatud_ettekirjutus": False, "kontrollimised": {"kontrollitud_soitjate_veol": False},
       "rikkumised": {"rikkumised_loend": []}, "vaarteomenetlus": "MOCK-VM-001"}
job_v3 = dict(job, soiduki_reg_nr="MOCK123", soiduki_vin="MOCKVIN0000000001", juhi_isikukood=SUCCESS_PERSON,
              juhi_eesnimi="Test", juhi_perekonnanimi="Juht", menetluse_liik="uldmenetlus", menetluse_number="MOCK-001")
target_response = []
for row in target_rows:
    item = {k: row[k] for k in ["licence_plate_no", "trailer_no", "inspection_id", "inspection_no",
                                "inspection_date", "inspection_type", "inspection_unit", "inspection_notes", "inspector"]}
    item.update(issues={"item": [{"code": d["partCode"], "value": d["defectCode"]}
                                for d in json.loads(row["issues_json"])]}, notes={"item": []},
                inspection_refine_options={"item": [code for flag, code in [
                    ("regnr", "REGNR"), ("vintin", "VINTIN"), ("axles", "AXLES"),
                    ("places", "PLACES"), ("rebuilt", "REBUILT")] if row.get("era_yv_mnt_" + flag)]})
    target_response.append(item)
usage_response = [{"logtime": r["logtime"], "action": r["action"], "receiverCode": r["receiver_code"],
                   "receiverName": r["receiver_name"] or None, "receiverSystem": r["receiver_system"] or None}
                  for r in usage_rows]

operations = [
    ("POST", "isiku-kontroll", "IsikuKontroll", "v1", {"isikukood": SUCCESS_PERSON}, {"kontrollid": {"item": person_rows}}),
    ("POST", "isiku-ettevote-kontrollid", "IsikuEttevoteKontrollid", "v1", {"isikukood": SUCCESS_PERSON}, {"kontrollid": {"item": company_rows}}),
    ("POST", "erakorraline-yv-query", "ErakorralineYVquery", "v1", {"alates": "2026-06-01", "kuni": "2026-06-30"}, {"targeted_for_inspection": {"item": target_response}}),
    ("POST", "erakorraline-yv-confirm", "ErakorralineYVconfirm", "v1", {"confirmed": {"item": [{"inspection_id": "900001", "code": "INSPECTION_DATE", "value": "2026-06-16"}]}}, {"confirmed": 1}),
    ("POST", "register-job-inspection", "RegisterJobInspection", "v1", job, {"message": "Success"}),
    ("POST", "register-job-inspection-v3", "RegisterJobInspection_v3", "v3", job_v3, {"message": "Success"}),
    ("GET", "findUsage", "findUsage", "v2", {"userCode": SUCCESS_PERSON, "offset": "0", "limit": "1000"}, {"totalUsages": 3, "usages": usage_response}),
    ("GET", "usagePeriod", "usagePeriod", "v2", {}, {"periodStart": "2026-06-13T12:00:00Z"}),
    ("GET", "heartbeat", "heartbeat", "v2", {}, {"status": "OK", "message": "API is ready"}),
]
emit(DEST / ".guard.yml", {"declaration": {"description": "Avalik sünteetiline mock. POST X-tee päise kontroll alampuus; AJ UserId kontroll handleris."},
                          "allow": {"status": 200, "return": "ok", "next": "end"}})
guard = yaml.safe_load((SOURCE / "POST/xroad/provide/.guard").read_text())
guard = {"declaration": {"description": "X-Road-Client peab olema neljaosaline. Ainult mockis 70000000 tähistab keelatud tarbijat."}, **guard}
guard["checkXRoadClient"]["switch"].append({"condition": expression("(incoming.headers['x-road-client'] || '').split('/')[2] === '70000000'"), "next": "deny"})
emit(DEST / "POST/xroad/v1/.guard.yml", adapt_runtime(guard))
emit(DEST / "GET/health/ready.yml", {"declaration": {"description": "Avalik sünteetilise mocki tervisekontroll."},
                                    "ready": {"status": 200, "return": {"status": "OK", "mock": True}, "wrapper": False, "next": "end"}})

tests = []
openapi = {"openapi": "3.0.3", "info": {"title": "LJVIS2 X-tee arendaja-mock", "version": "1.0.0",
            "description": "Sünteetiline sandbox. Päris turvaserveri teenusekoodide vastavus: x-xroad-service ja x-provider-path. Ei salvesta ega kutsu päristeenuseid."},
           "servers": [{"url": "https://dev.liiklusvalve.ee/developer"}, {"url": "http://localhost:3001/developer"},
                       {"url": "http://localhost:8086/xtee-mock"}], "paths": {}}
collection = {"info": {"name": "LJVIS2 X-tee developer mock", "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"},
              "variable": [{"key": k, "value": v} for k, v in {"baseUrl": "https://dev.liiklusvalve.ee/developer", "xRoadClient": CLIENT,
                           "personCode": SUCCESS_PERSON, "inspectionId": "900001", "offset": "0", "limit": "1"}.items()], "item": []}
sections = ["# Pakutavad teenused\n\nKõik näited on sünteetilised. Päris teenuste taust, SQL ja turvaserveri seadistus: [senine juhend](../xtee/00-xtee-teenused-publikatsiooni-juhend.md).\n\n"
            "Mock matkib rakenduse valideerimist ja vastusekuju, mitte turvaserveri krüptograafiat või õiguste konfiguratsiooni. `X-Mock-Scenario` on ainult mocki päis.\n"]
manifest = []


def add_test(name, method, path, body=None, query=None, headers=None, status=200, expected=None):
    request = {"method": method, "path": "/xtee-mock" + path, "headers": headers if headers is not None else {"content-type": "application/json", "x-road-client": CLIENT}}
    if body is not None:
        request["body"] = body
    if query:
        request["query"] = query
    expect = {"status": status}
    if expected is not None:
        expect["body_matches"] = expected
    tests.append({"name": name, "request": request, "expect": expect})


for method, name, service, version, sample, success in operations:
    source_path = f"{method}/xroad/" + ("provide/" if method == "POST" else "v2/") + name + ".yml"
    mock_path = "/xroad/" + ("v1/" if method == "POST" else "v2/") + name
    data = yaml.safe_load((SOURCE / source_path).read_text())
    data["declaration"] = {"version": "1.0", "description": f"{service}: sünteetiline mock. Valideerimine ja vastuse kaardistus päris workflow'st {source_path}. X-Mock-Scenario: empty või server-error.", "namespace": "xtee-mock"}
    body_fields = sorted(set(re.findall(r"incoming\.body\.([A-Za-z_]\w*)", json.dumps(data))))
    data["declaration"]["allowlist"] = {
        "headers": [{"field": field, "required": False} for field in ["content-type", "x-road-client", "x-road-userid", "x-mock-scenario"]],
        "body": [{"field": field, "required": False} for field in body_fields],
        "params": [{"field": field, "required": False} for field in ["userCode", "periodStart", "periodEnd", "offset", "limit"]] if name == "findUsage" else [],
    }
    # Replace every backend and audit call, keeping validation and mapping intact.
    for step_name, step in list(data.items()):
        if not isinstance(step, dict) or "call" not in step:
            continue
        url = step["args"]["url"]
        result = step["result"]
        rows = "[]"
        if url.endswith("/isiku-kontroll"):
            rows = response_expr(person_rows, f"isikukood === '{SUCCESS_PERSON}'")
        elif url.endswith("/isiku-ettevote-kontrollid"):
            rows = response_expr(company_rows, f"isikukood === '{SUCCESS_PERSON}'")
        elif url.endswith("/erakorraline-yv-query"):
            rows = response_expr(target_rows)  # fixed dates filtered as the real SQL does
            rows = expression("(" + rows[2:-1] + ").filter(function(r) {return r.inspection_date >= alates && r.inspection_date <= kuni;})")
        elif url.endswith("/erakorraline-yv-confirm-update"):
            rows = expression("['900001','900002'].indexOf(String(items[current_index].inspection_id)) >= 0 ? [{confirmed:true}] : []")
        elif url.endswith("-insert"):
            rows = expression('[{"id":900001,"form_number":"MOCK-TI-001","skipped":false}]')
        elif url.endswith("/find_usage"):
            # SQL COUNT OVER is absent on an exhausted page; the actual mapper then returns totalUsages=0.
            rows = expression("(incoming.headers['x-mock-scenario'] === 'empty' || user_code !== '" + SUCCESS_PERSON + "' ? [] : " + json.dumps(usage_rows) + ").filter(function(r) {return (!period_start || r.logtime >= period_start) && (!period_end || r.logtime <= period_end);}).map(function(r, i, all) {return Object.assign({}, r, {total_usages:all.length});}).slice(offset_val, offset_val + limit_val)")
        elif url.endswith("/usage_period"):
            rows = expression("[{period_start: incoming.headers['x-mock-scenario'] === 'empty' ? null : '2026-06-13T12:00:00Z'}]")
        elif "/log_" in url:
            rows = expression("[]")
        else:
            raise RuntimeError(f"Unrecognised outbound call: {url}")
        if rows == "[]":
            rows = expression("[]")
        data[step_name] = {"assign": {result: {"response": {"status": expression("incoming.headers['x-mock-scenario'] === 'server-error' ? 500 : 200"), "body": rows}}}, "next": step["next"]}
    data = adapt_runtime(data)
    if name == "findUsage":
        # Assign steps are evaluated as a map; don't read rows while assigning it.
        rows_step = {"assign": {"rows": data["buildResponse"]["assign"].pop("rows")}, "next": "buildResponse"}
        data["checkQueryStatus"]["next"] = "assignRows"
        data["assignRows"] = rows_step
    emit(DEST / (method + mock_path + ".yml"), data)
    emit(DOCS / "examples" / (name + "-request.json"), json_text(sample))
    emit(DOCS / "examples" / (name + "-success.json"), json_text(success))
    errors = []
    for step in data.values():
        if isinstance(step, dict) and isinstance(step.get("status"), int) and step["status"] >= 400:
            try:
                error = step["return"] if isinstance(step["return"], dict) else json.loads(step["return"])
            except (ValueError, TypeError):
                continue
            if (step["status"], error) not in errors:
                errors.append((step["status"], error))
    if method == "POST":
        errors.append((403, json.loads(guard["deny"]["return"])))
    emit(DOCS / "examples" / (name + "-errors.json"), json_text([{"status": s, "body": e} for s, e in errors]))
    headers = {"content-type": "application/json", "x-road-client": CLIENT} if method == "POST" else {}
    if name == "findUsage":
        headers["x-road-userid"] = SUCCESS_PERSON
    add_test(service + " success", method, mock_path, sample if method == "POST" else None, sample if method == "GET" else None, headers, expected=success)
    if method == "POST":
        for h, title in [({}, "missing client"), ({"x-road-client": "bad"}, "malformed client"), ({"x-road-client": DENIED_CLIENT}, "denied client")]:
            add_test(service + " " + title, method, mock_path, sample, headers={"content-type": "application/json", **h}, status=403, expected=json.loads(guard["deny"]["return"]))
        add_test(service + " missing body", method, mock_path, {}, status=400)
    if name != "heartbeat":
        add_test(service + " server error", method, mock_path, sample if method == "POST" else None, sample if method == "GET" else None,
                 {**headers, "x-mock-scenario": "server-error"}, status=500, expected={"error": "SERVER_ERROR", "message": "Internal error"})
    params = []
    if method == "POST":
        params.append({"in": "header", "name": "X-Road-Client", "required": True, "schema": {"type": "string"}, "example": CLIENT})
    params.append({"in": "header", "name": "X-Mock-Scenario", "required": False,
                   "schema": {"type": "string", "enum": ["empty", "server-error"]}, "description": "Ainult mockis; heartbeat ignoreerib."})
    if name == "findUsage":
        params.append({"in": "header", "name": "X-Road-UserId", "required": True, "schema": {"type": "string"}, "example": SUCCESS_PERSON})
        for k in ["userCode", "periodStart", "periodEnd", "offset", "limit"]:
            params.append({"in": "query", "name": k, "required": k == "userCode", "schema": {"type": "integer" if k in ["offset", "limit"] else "string"}})
    responses = {"200": {"description": "Edukas vastus; tühi loend on edukas.", "content": {"application/json": {"schema": schema(success), "example": success}}}}
    # Merge all error variants at each HTTP status instead of hiding individual codes.
    for status in sorted({s for s, e in errors}):
        variants = [e for s, e in errors if s == status]
        responses[str(status)] = {"description": ", ".join(dict.fromkeys(e["error"] for e in variants)), "content": {"application/json": {
            "schema": {"type": "object", "required": ["error", "message"], "properties": {"error": {"type": "string"}, "message": {"type": "string"}}},
            "examples": {f"error{i}": {"value": e} for i, e in enumerate(variants)}}}}
    op = {"operationId": service, "summary": service, "x-xroad-service": {"code": service, "version": version},
          "x-provider-path": "/ljvis/xroad/" + ("provide/" if method == "POST" else "v2/") + name,
          "parameters": params, "responses": responses}
    if method == "POST":
        request_schema = schema(sample)
        required = ["isikukood"] if "isikukood" in sample else ["alates", "kuni"] if "alates" in sample else ["confirmed"] if "confirmed" in sample else ["kontrollija", "kontrolli_id", "kontrolli_kp", "tooandja_nimi", "tooandja_reg_kood", "koostatatud_ettekirjutus", "kontrollimised", "rikkumised"]
        request_schema["required"] = required
        request_schema["additionalProperties"] = True
        if "isikukood" in request_schema["properties"]:
            request_schema["properties"]["isikukood"]["pattern"] = "^[1-6][0-9]{10}$"
        if "confirmed" in request_schema["properties"]:
            items_schema = request_schema["properties"]["confirmed"]["properties"]["item"]
            items_schema["minItems"] = 1
            items_schema["items"]["properties"]["code"]["enum"] = ["INSPECTION_DATE", "ENFORCEMENT_DECISION", "CLOSURE_BASIS"]
        if "kontrollimised" in request_schema["properties"]:
            for k in ["kontrollimised", "rikkumised"]:
                request_schema["properties"][k] = {"type": "object", "additionalProperties": True}
        op["requestBody"] = {"required": True, "content": {"application/json": {"schema": request_schema, "example": sample}}}
    openapi["paths"][mock_path] = {method.lower(): op}
    manifest.append({"method": method, "mockPath": mock_path, "service": service, "version": version, "providerPath": op["x-provider-path"], "source": "DSL/Ruuter.internal/ljvis/" + source_path})
    postman_headers = [{"key": "Content-Type", "value": "application/json"}]
    if method == "POST":
        postman_headers.append({"key": "X-Road-Client", "value": "{{xRoadClient}}"})
    if name == "findUsage":
        postman_headers.append({"key": "X-Road-UserId", "value": "{{personCode}}"})
    url = "{{baseUrl}}" + mock_path
    if name == "findUsage":
        url += "?userCode={{personCode}}&offset={{offset}}&limit={{limit}}"
    raw = json_text(sample).replace(SUCCESS_PERSON, "{{personCode}}").replace('"900001"', '"{{inspectionId}}"')
    req = {"method": method, "header": postman_headers, "url": url}
    if method == "POST":
        req["body"] = {"mode": "raw", "raw": raw, "options": {"raw": {"language": "json"}}}
    assertions = ['pm.test("HTTP 200", () => pm.response.to.have.status(200));',
                  'const body = pm.response.json();',
                  f'pm.test("Response envelope", () => pm.expect(body).to.have.property({json.dumps(next(iter(success)))}));']
    if name == "findUsage":
        assertions.append('pm.test("Deterministic page", () => {pm.expect(body.totalUsages).to.eql(3); pm.expect(body.usages).to.have.lengthOf(1); pm.expect(body.usages[0].logtime).to.eql("2026-06-15T12:00:00Z");});')
    else:
        assertions.append('pm.test("Response fixture", () => pm.expect(body).to.deep.equal(' + json.dumps(success, ensure_ascii=False) + '));')
    collection["item"].append({"name": service, "request": req, "event": [{"listen": "test", "script": {"type": "text/javascript", "exec": assertions}}]})
    curl = f"curl --fail-with-body -X {method} 'https://dev.liiklusvalve.ee/developer{mock_path}"
    if name == "findUsage":
        curl += f"?userCode={SUCCESS_PERSON}&offset=0&limit=1"
    curl += "'"
    if method == "POST":
        curl += f" \\\n  -H 'Content-Type: application/json' -H 'X-Road-Client: {CLIENT}' \\\n  --data-binary @docs/developer/examples/{name}-request.json"
    if name == "findUsage":
        curl += f" -H 'X-Road-UserId: {SUCCESS_PERSON}'"
    sections.append(f"\n## {service}\n\n- Meetod: `{method}`; mock: `/developer{mock_path}`.\n- Päris turvaserveri tarbija URL: `https://<tarbija-turvaserver>/r1/{{instance}}/GOV/70001231/ljvis2/{service}/{version}`.\n- Pakkuja sisetee: `{op['x-provider-path']}`; [workflow](../../{manifest[-1]['source']}).\n- Sisend: [JSON näidis](examples/{name}-request.json) (GET puhul query parameetrid, mitte keha).\n- Vastus: [edukas JSON](examples/{name}-success.json); [vead koos staatustega](examples/{name}-errors.json).\n\n```bash\n{curl}\n```\n\nHTTP 200:\n\n```json\n{json_text(success).strip()}\n```\n")
    if errors:
        sections.append(f"\nVigane päring: {'kohustuslik keha-väli puudub' if method == 'POST' else 'AJ päis puudub või ei vasta userCode-le'}. HTTP {errors[0][0]}:\n\n```json\n{json_text(errors[0][1]).strip()}\n```\n")

add_test("health is public without session and X-Road headers", "GET", "/health/ready", headers={}, expected={"status": "OK", "mock": True})
for name in ["isiku-kontroll", "isiku-ettevote-kontrollid"]:
    add_test(name + " unknown valid person is empty", "POST", "/xroad/v1/" + name, {"isikukood": EMPTY_PERSON}, expected={"kontrollid": {"item": []}})
    add_test(name + " invalid person", "POST", "/xroad/v1/" + name, {"isikukood": "bad"}, status=400, expected={"error": "INVALID_PARAMETER", "message": "isikukood must be 11 digits starting with 1-6"})
add_test("date order", "POST", "/xroad/v1/erakorraline-yv-query", {"alates": "2026-07-01", "kuni": "2026-06-01"}, status=400)
add_test("date filter empty", "POST", "/xroad/v1/erakorraline-yv-query", {"alates": "2027-01-01", "kuni": "2027-02-01"}, expected={"targeted_for_inspection": {"item": []}})
add_test("confirmation unknown identifier", "POST", "/xroad/v1/erakorraline-yv-confirm", {"confirmed": {"item": [{"inspection_id": "999999", "code": "INSPECTION_DATE", "value": "2026-06-16"}]}}, status=404)
add_test("confirmation invalid enum", "POST", "/xroad/v1/erakorraline-yv-confirm", {"confirmed": {"item": [{"inspection_id": "900001", "code": "BAD", "value": "x"}]}}, status=400)
add_test("confirmation repeated request is deterministic", "POST", "/xroad/v1/erakorraline-yv-confirm", operations[3][4], expected={"confirmed": 1})
minimal_job = {k: v for k, v in job.items() if k not in ["soidukite_arv", "vaarteomenetlus"]}
add_test("v3 optional fields absent", "POST", "/xroad/v1/register-job-inspection-v3", minimal_job, expected={"message": "Success"})
add_test("v3 invalid optional person", "POST", "/xroad/v1/register-job-inspection-v3", dict(job_v3, juhi_isikukood="bad"), status=400)
add_test("v3 invalid optional enum", "POST", "/xroad/v1/register-job-inspection-v3", dict(job_v3, menetluse_liik="bad"), status=400)
add_test("job repeated request", "POST", "/xroad/v1/register-job-inspection", job, expected={"message": "Success"})
add_test("AJ missing userid", "GET", "/xroad/v2/findUsage", query={"userCode": SUCCESS_PERSON}, headers={}, status=400, expected={"error": "MISSING_HEADER", "message": "X-Road-UserId header is required"})
add_test("AJ missing userCode", "GET", "/xroad/v2/findUsage", headers={"x-road-userid": SUCCESS_PERSON}, status=400)
add_test("AJ mismatched userid", "GET", "/xroad/v2/findUsage", query={"userCode": SUCCESS_PERSON}, headers={"x-road-userid": EMPTY_PERSON}, status=400, expected={"error": "FORBIDDEN", "message": "X-Road-UserId must match userCode"})
for offset in range(4):
    add_test("AJ deterministic page " + str(offset), "GET", "/xroad/v2/findUsage", query={"userCode": SUCCESS_PERSON, "offset": str(offset), "limit": "1"}, headers={"x-road-userid": SUCCESS_PERSON}, expected={"totalUsages": 3 if offset < 3 else 0, "usages": usage_response[offset:offset+1]})
add_test("AJ unknown person", "GET", "/xroad/v2/findUsage", query={"userCode": EMPTY_PERSON}, headers={"x-road-userid": EMPTY_PERSON}, expected={"totalUsages": 0, "usages": []})
add_test("AJ date filtering", "GET", "/xroad/v2/findUsage", query={"userCode": SUCCESS_PERSON, "periodStart": "2026-06-14T00:00:00Z", "periodEnd": "2026-06-14T23:59:59Z"}, headers={"x-road-userid": SUCCESS_PERSON}, expected={"totalUsages": 1, "usages": usage_response[1:2]})
add_test("usage period empty", "GET", "/xroad/v2/usagePeriod", headers={"x-mock-scenario": "empty"}, expected={"periodStart": None})
for scenario in tests:
    if scenario["name"].endswith(" success"):
        continue
    request = scenario["request"]
    url = "{{baseUrl}}" + request["path"][len("/xtee-mock"):]
    query = request.get("query", {})
    if query:
        from urllib.parse import urlencode
        url += "?" + urlencode(query)
    postman_request = {"method": request["method"], "url": url,
                       "header": [{"key": k, "value": v} for k, v in request.get("headers", {}).items()]}
    if "body" in request:
        postman_request["body"] = {"mode": "raw", "raw": json_text(request["body"]), "options": {"raw": {"language": "json"}}}
    expect = scenario["expect"]
    script = [f'pm.test("HTTP {expect["status"]}", () => pm.response.to.have.status({expect["status"]}));']
    if "body_matches" in expect:
        script.append('pm.test("Response fixture", () => pm.expect(pm.response.json()).to.deep.equal(' + json.dumps(expect["body_matches"], ensure_ascii=False) + '));')
    collection["item"].append({"name": scenario["name"], "request": postman_request,
                              "event": [{"listen": "test", "script": {"type": "text/javascript", "exec": script}}]})
emit(ROOT / "DSL-mock-tests/xtee.test.yml", {"mode": "inprocess", "tests": tests})
emit(DOCS / "xtee-openapi.yaml", openapi)
emit(DOCS / "ljvis2-xtee-mock.postman_collection.json", json_text(collection))
emit(DOCS / "operations.json", json_text(manifest))
emit(DOCS / "services.md", "".join(sections))
if drift:
    sys.exit("Generated artifacts differ; run python3 scripts/generate-xtee-mock.py:\n" + "\n".join(drift))
print(f"{'Checked' if check else 'Generated'} {len(operations)} operations and {len(tests)} scenarios")
