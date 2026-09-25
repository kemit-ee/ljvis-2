#!/usr/bin/env python3
"""Regenerate the X-Road provider OpenAPI DSL route from the source contract.

Ruuter DSL has no "read file from disk" step, so the security-server-facing
GET /ljvis/xroad/provide/openapi route embeds the OpenAPI 3.0 contract
verbatim as a `return:` block scalar. This script keeps that copy in sync
with the canonical docs/xtee/XroadOpenapi.yaml. Run --check in CI to detect
drift between the two.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "docs/xtee/XroadOpenapi.yaml"
DEST = ROOT / "DSL/Ruuter.internal/ljvis/GET/xroad/provide/openapi.yml"
check = "--check" in sys.argv

HEADER = '''declaration:

  version: "1.0"
  description: >-
    X-Road (X-tee) REST-teenuste OpenAPI 3.0 kirjeldus turvaserveri jaoks.
    Turvaserver saab selle URL-i teenuse kirjeldusena registreerida
    (Teenused -> Lisa REST -> Kirjelduse URL), et automaatselt teenuste
    lepingut uuendada. Sisu on genereeritud failist docs/xtee/XroadOpenapi.yaml
    skriptiga scripts/generate-xroad-openapi-dsl.py — ÄRA MUUDA KÄSITSI.
  namespace: xroad-openapi

returnOpenapi:
  status: 200
  return: |
'''

FOOTER = '''
  next: end
'''


def main():
    source_text = SOURCE.read_text(encoding="utf-8")
    indented = "\n".join(
        ("    " + line) if line.strip() else "" for line in source_text.splitlines()
    )
    generated = HEADER + indented + FOOTER

    if check:
        current = DEST.read_text(encoding="utf-8") if DEST.exists() else None
        if current != generated:
            sys.exit(
                f"{DEST.relative_to(ROOT)} is out of sync with {SOURCE.relative_to(ROOT)}; "
                "run: python3 scripts/generate-xroad-openapi-dsl.py"
            )
        print(f"Checked {DEST.relative_to(ROOT)} — in sync with {SOURCE.relative_to(ROOT)}")
    else:
        DEST.parent.mkdir(parents=True, exist_ok=True)
        DEST.write_text(generated, encoding="utf-8")
        print(f"Generated {DEST.relative_to(ROOT)} from {SOURCE.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
