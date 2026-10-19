#!/usr/bin/env python3
"""Resql 0.4+ bearer gate: every DSL step that calls Resql ([#LJVIS_RESQL], [#LJVIS_RESQL_ARHIIV])
must send `Authorization: Bearer [#RESQL_INTER_SERVICE_TOKEN]`, otherwise Resql answers 401.

The token is a separate secret from INTERNAL_COMMUNICATION_KEY and must only go to Resql
(it must never reach XTR's REST lane, which forwards inbound headers).
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = re.compile(r'^(\s*)url:\s*["\']?(\[#[A-Z_]+\])')
RESQL = {"[#LJVIS_RESQL]", "[#LJVIS_RESQL_ARHIIV]"}
BEARER = re.compile(r'Authorization:\s*"Bearer \[#RESQL_INTER_SERVICE_TOKEN\]"')
TOKEN = "[#RESQL_INTER_SERVICE_TOKEN]"

errors = []
for path in sorted((ROOT / "DSL").rglob("*.yml")):
    lines = path.read_text().split("\n")
    for i, line in enumerate(lines):
        m = URL.match(line)
        if not m:
            continue
        indent, const = len(m.group(1)), m.group(2)
        block = []
        for x in lines[i + 1:i + 40]:
            if x.strip() and len(x) - len(x.lstrip()) < indent:
                break
            if re.match(r"\s{%d}url:" % indent, x):
                break
            block.append(x)
        text = "\n".join(block)
        rel = f"{path.relative_to(ROOT)}:{i + 1}"
        if const in RESQL and not BEARER.search(text):
            errors.append(f"{rel}: Resql call without Authorization: Bearer {TOKEN}")
        if const not in RESQL and TOKEN in text:
            errors.append(f"{rel}: {TOKEN} sent to {const}, not Resql")

if errors:
    print("Resql bearer-token rule violated (see scripts/check-resql-bearer.py):")
    print("\n".join(errors))
    sys.exit(1)
print("OK: every Resql call carries the bearer token, and only Resql gets it")
