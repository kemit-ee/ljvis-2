#!/usr/bin/env python3
"""#520: the shared service token (header x-internal-service-token) may only be sent to services
that are ours and do not forward inbound headers.

XTR's REST lane (DSL kind: rest: rr/isikud, postkast/*, and the ERRU/Postkasti endpoints that
point at XTR in production) forwards EVERY inbound header to the X-Road security server, so the
token must never be sent there (verified against xtr 0.5.0-rc: executor/rest_lane.rs forwards unknown inbound headers; SOAP executors set only their own). The SOAP lane builds its own
request and does not forward headers.

Fails when a DSL step sends the token to a URL outside the allowlist.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TOKEN = "x-internal-service-token"
URL = re.compile(r'^(\s*)url:\s*["\']?(\[#[A-Z_]+\])(\S*?)["\']?\s*$')

ALLOWED = {
    "[#LJVIS_RESQL]", "[#LJVIS_RESQL_ARHIIV]", "[#LJVIS_TIM]", "[#LJVIS_DMAPPER]", "[#LJVIS_DMAPPER_HBS]",
    "[#LJVIS_RUUTER]", "[#LJVIS_RUUTER_INTERNAL]",
}
# The adapter consumes the token locally. Its Hub request sets only Content-Type;
# it does not forward the incoming service token or other incoming headers.
ADAPTER_INTERNAL_PATHS = {"/internal/rsi/validate", "/internal/rsi/send",
                          "/internal/cgr/validate", "/internal/cgr/send",
                          "/internal/ctud/validate", "/internal/ctud/send",
                          "/internal/ncr/validate", "/internal/ncr/send",
                          "/internal/ncr-response/validate", "/internal/ncr-response/send",
                          "/internal/nu/validate", "/internal/nu/send"}
# Registry endpoints that point at XTR in production. The token header may be present only as
# a ternary that yields the token solely for the exact local mock URL (and '' otherwise).
MOCK_GUARDED = {
    "[#ERRU_MTR_ENDPOINT]": "http://ruuter:8080/ljvis/v1/erru/mock/mtr/check-community-licence",
    "[#ERRU_CGR_MTR_ENDPOINT]": "http://ruuter:8080/ljvis/v1/erru/mock/mtr/check-transport-manager-good-repute",
    "[#ERRU_RSI_LIIKLUSREGISTER_ENDPOINT]": "http://ruuter:8080/ljvis/v1/erru/mock/xtee/liiklusregister-paring2",
}
XTR_SOAP_PREFIXES = ("/ar/", "/etoimik/", "/mtr/", "/liiklusregister/")

errors = []
for path in sorted((ROOT / "DSL").rglob("*.yml")):
    lines = path.read_text().split("\n")
    for i, line in enumerate(lines):
        m = URL.match(line)
        if not m:
            continue
        indent, const, rest = len(m.group(1)), m.group(2), m.group(3)
        block = []
        for x in lines[i + 1:i + 40]:
            if x.strip() and len(x) - len(x.lstrip()) < indent:
                break
            if re.match(r"\s{%d}url:" % indent, x):
                break
            block.append(x)
        if not any(TOKEN in x for x in block):
            continue
        guarded = const in MOCK_GUARDED and not rest and all(
            f"{TOKEN}: " not in x or (
                f"'{const}' === '{MOCK_GUARDED[const]}' ? '[#INTERNAL_COMMUNICATION_KEY]' : ''" in x)
            for x in block)
        ok = (const in ALLOWED or guarded
              or (const == "[#LJVIS_XTR]" and rest.startswith(XTR_SOAP_PREFIXES))
              or (const == "[#ERRU_XML_ADAPTER]" and rest in ADAPTER_INTERNAL_PATHS))
        if not ok:
            errors.append(f"{path.relative_to(ROOT)}:{i + 1}: {TOKEN} sent to {const}{rest}")

if errors:
    print("Service token sent to a target that may forward it (see scripts/check-internal-token-targets.py):")
    print("\n".join(errors))
    sys.exit(1)
print("OK: service token only goes to allowlisted targets")
