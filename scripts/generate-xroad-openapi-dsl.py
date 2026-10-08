#!/usr/bin/env python3
"""Regenerate the X-Road provider OpenAPI DSL routes from the source contracts.

Ruuter DSL has no "read file from disk" step, so the security-server-facing
GET /ljvis/xroad/provide/openapi route embeds the OpenAPI 3.0 contract as a
YAML mapping under `return:` with `wrapper: false`, so Ruuter serves the
contract itself as JSON. A block scalar (`return: |`) would be served as
{"response": "<yaml text>"}, which Swagger and the security server cannot
parse. This script keeps that copy in sync with the canonical
docs/xtee/XroadOpenapi.yaml. The Andmejälgija findUsage service has its own
contract (docs/xtee/FindUsageOpenapi.yaml → GET /ljvis/xroad/v2/openapi), because
it is a separate X-Road service. Run --check in CI to detect drift.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTRACTS = [
    (ROOT / "docs/xtee/XroadOpenapi.yaml",
     ROOT / "DSL/Ruuter.internal/ljvis/GET/xroad/provide/openapi.yml",
     "X-Road (X-tee) REST-teenuste"),
    (ROOT / "docs/xtee/FindUsageOpenapi.yaml",
     ROOT / "DSL/Ruuter.internal/ljvis/GET/xroad/v2/openapi.yml",
     "Andmejälgija (AJ) X-tee teenuse findUsage"),
]
check = "--check" in sys.argv

HEADER = '''declaration:
  internal: false

  version: "1.0"
  description: >-
    {title} OpenAPI 3.0 kirjeldus turvaserveri jaoks.
    Turvaserver saab selle URL-i teenuse kirjeldusena registreerida
    (Teenused -> Lisa REST -> Kirjelduse URL), et automaatselt teenuste
    lepingut uuendada. Sisu on genereeritud failist {source}
    skriptiga scripts/generate-xroad-openapi-dsl.py — ÄRA MUUDA KÄSITSI.
  namespace: xroad-openapi

returnOpenapi:
  status: 200
  wrapper: false
  return:
'''

FOOTER = '''
  next: end
'''


def generate(source, dest, title):
    source_text = source.read_text(encoding="utf-8")
    indented = "\n".join(
        ("    " + line) if line.strip() else "" for line in source_text.splitlines()
    )
    header = HEADER.replace("{title}", title).replace("{source}", str(source.relative_to(ROOT)))
    generated = header + indented + FOOTER

    if check:
        current = dest.read_text(encoding="utf-8") if dest.exists() else None
        if current != generated:
            sys.exit(
                f"{dest.relative_to(ROOT)} is out of sync with {source.relative_to(ROOT)}; "
                "run: python3 scripts/generate-xroad-openapi-dsl.py"
            )
        print(f"Checked {dest.relative_to(ROOT)} — in sync with {source.relative_to(ROOT)}")
    else:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(generated, encoding="utf-8")
        print(f"Generated {dest.relative_to(ROOT)} from {source.relative_to(ROOT)}")


def main():
    for source, dest, title in CONTRACTS:
        generate(source, dest, title)


if __name__ == "__main__":
    main()
