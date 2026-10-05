#!/usr/bin/env python3
"""#520: the shared service token (header x-internal-service-token) may only be sent to services
that are ours and do not forward inbound headers.

XTR's REST lane (DSL kind: rest: rr/isikud, postkast/*, and the ERRU/Postkasti endpoints that
point at XTR in production) forwards EVERY inbound header to the X-Road security server, so the
token must never be sent there (verified against xtr 0.4.1-rc). The SOAP lane builds its own
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
        ok = const in ALLOWED or (const == "[#LJVIS_XTR]" and rest.startswith(XTR_SOAP_PREFIXES))
        if not ok:
            errors.append(f"{path.relative_to(ROOT)}:{i + 1}: {TOKEN} sent to {const}{rest}")

if errors:
    print("Service token sent to a target that may forward it (see scripts/check-internal-token-targets.py):")
    print("\n".join(errors))
    sys.exit(1)
print("OK: service token only goes to allowlisted targets")
