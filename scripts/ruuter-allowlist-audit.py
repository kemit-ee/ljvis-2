#!/usr/bin/env python3
"""Audit Ruuter DSL declaration.allowlist coverage.

For every HTTP handler DSL under DSL/Ruuter*/ljvis (excluding templates/, mock,
guards), compare the set of request fields the DSL reads (`incoming.body.X` /
`incoming.params.X`) against what its `declaration.allowlist` (or legacy
`allowed_body`/`allowed_params`) declares.

Reports:
  - handlers with NO declaration block
  - handlers with a declaration but NO allowlist
  - handlers whose allowlist is INCOMPLETE (reads a field it doesn't declare)
  - handlers without `declaration.strict: true`

Read-only. Run from the repo root:  python3 scripts/ruuter-allowlist-audit.py
"""

from __future__ import annotations

import glob
import re
import sys

try:
    import yaml
except ImportError:
    sys.exit("pyyaml required: pip install pyyaml")

READ_RE = re.compile(r"incoming\.(?:body|params)\.([A-Za-z_]\w*)")
DECL_RE = re.compile(r"\Adeclaration:\n(.*?)(?=\n[A-Za-z_][\w]*:\s*\n|\Z)", re.S)


def is_handler(path: str) -> bool:
    return (
        "/templates/" not in path
        and "/mock/" not in path
        and not path.endswith("mock.yml")
        and ".guard" not in path
    )


def parse_declaration(text: str) -> dict | None:
    m = DECL_RE.match(text)
    if not m:
        return None
    body = re.sub(r"^", "  ", m.group(1), flags=re.M)
    try:
        return yaml.safe_load("decl:\n" + body)["decl"] or {}
    except Exception:
        return {}


def declared_fields(decl: dict) -> tuple[set[str], bool]:
    """(all declared body+params field names, has_any_allowlist)."""
    fields: set[str] = set()
    has_allowlist = False
    al = decl.get("allowlist") or {}
    for section in ("body", "params", "headers"):
        entries = al.get(section)
        if entries is not None:
            has_allowlist = True
        for e in entries or []:
            fields.add(e["field"] if isinstance(e, dict) else e)
    for legacy in ("allowed_body", "allowed_params", "allowed_header"):
        entries = decl.get(legacy)
        if entries is not None:
            has_allowlist = True
        for e in entries or []:
            fields.add(e)
    return fields, has_allowlist


def main() -> int:
    files = sorted(
        f
        for f in glob.glob("DSL/Ruuter/ljvis/**/*.yml", recursive=True)
        + glob.glob("DSL/Ruuter.internal/ljvis/**/*.yml", recursive=True)
        if is_handler(f)
    )

    no_decl, no_allow, incomplete, no_strict = [], [], [], []
    for f in files:
        text = open(f, encoding="utf-8").read()
        decl = parse_declaration(text)
        if decl is None:
            no_decl.append(f)
            continue
        if not decl.get("strict"):
            no_strict.append(f)
        fields, has_allowlist = declared_fields(decl)
        reads = set(READ_RE.findall(text))
        if not has_allowlist:
            no_allow.append((f, sorted(reads)))
            continue
        missing = reads - fields
        if missing:
            incomplete.append((f, sorted(missing)))

    def section(title: str, rows: list) -> None:
        print(f"\n== {title} ({len(rows)}) ==")
        for row in rows:
            if isinstance(row, tuple):
                f, extra = row
                print(f"  {f}")
                if extra:
                    print(f"      {', '.join(extra)}")
            else:
                print(f"  {row}")

    print(f"handlers scanned: {len(files)}")
    section("NO declaration block", no_decl)
    section("declaration but NO allowlist (reads shown)", no_allow)
    section("allowlist INCOMPLETE (undeclared reads shown)", incomplete)
    print(f"\n== without declaration.strict: true: {len(no_strict)} ==")

    return 1 if (no_decl or no_allow or incomplete) else 0


if __name__ == "__main__":
    raise SystemExit(main())
