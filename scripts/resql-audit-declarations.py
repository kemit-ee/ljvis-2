#!/usr/bin/env python3
"""
resql-audit-declarations.py — read-only enumerator for the
askendest/resql:0.1.0-alpha.5 -> turnerrainer/resql:0.2.0-alpha migration.

turnerrainer/resql loads the whole SQL tree at boot and BAILS ON THE FIRST
bad file (src/loader.rs: `?` propagation) — you cannot enumerate all 209
rejects from one boot. This script replays the relevant parse offline so
the full picture is known before the migration touches anything.

For every DSL/Resql/**/*.sql it reports:
  - whether the leading /* ... */ block parses as YAML
  - which declaration shape it uses (declaration: wrapper / allowlist.body /
    accepts: list / response.fields / params: (new))
  - the declared parameter set
  - the :name parameters actually referenced by the SQL body, using the
    same skip rules as turnerrainer's `rewrite_named_params`
    (skips '...' "..." string literals, -- and /* */ comments, :: casts)
  - the diff between the two (either direction is boot-fatal in 0.2.0 via
    declaration::validate_against_sql)
  - `type: json` fields (must become `type: object`)
  - non-ASCII characters inside the declaration block (0.1.1 multi-byte
    rewriter fix makes these safe, but worth eyeballing)

Output: a human table on stdout + machine JSON to scripts/.resql-audit.json
(gitignored). Exit 0 always — this is a report, not a gate.

Usage:  python3 scripts/resql-audit-declarations.py [--sql-dir DSL/Resql]
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.exit("PyYAML required: pip install pyyaml")


# ---------------------------------------------------------------------------
# :name extraction — mirrors turnerrainer/resql src/query.rs rewrite_named_params
# ---------------------------------------------------------------------------
def referenced_params(sql_body: str) -> list[str]:
    out: list[str] = []
    i, n = 0, len(sql_body)
    while i < n:
        c = sql_body[i]
        # line comment
        if c == "-" and i + 1 < n and sql_body[i + 1] == "-":
            j = sql_body.find("\n", i)
            i = n if j == -1 else j
            continue
        # block comment
        if c == "/" and i + 1 < n and sql_body[i + 1] == "*":
            j = sql_body.find("*/", i + 2)
            i = n if j == -1 else j + 2
            continue
        # string literal (doubled quote = escape)
        if c in ("'", '"'):
            quote = c
            i += 1
            while i < n:
                if sql_body[i] == quote:
                    if i + 1 < n and sql_body[i + 1] == quote:
                        i += 2
                        continue
                    i += 1
                    break
                i += 1
            continue
        # :: cast
        if c == ":" and i + 1 < n and sql_body[i + 1] == ":":
            i += 2
            continue
        # :ident
        if c == ":" and i + 1 < n and (sql_body[i + 1].isalpha() or sql_body[i + 1] == "_"):
            m = re.match(r":([A-Za-z_][A-Za-z0-9_]*)", sql_body[i:])
            name = m.group(1)
            if name not in out:
                out.append(name)
            i += m.end()
            continue
        i += 1
    return out


# ---------------------------------------------------------------------------
# leading /* ... */ block — mirrors declaration.rs extract_block
# ---------------------------------------------------------------------------
def extract_block(raw: str) -> tuple[str | None, str]:
    s = raw.lstrip()
    if not s.startswith("/*"):
        return None, raw
    # index of first non-ws in the ORIGINAL string
    start = len(raw) - len(s)
    close = raw.find("*/", start + 2)
    if close == -1:
        return None, raw
    return raw[start + 2 : close], raw[close + 2 :]


def declared_params(decl: dict) -> tuple[set[str], str, list[str]]:
    """Return (param names, shape label, type:json field names)."""
    d = decl.get("declaration", decl)  # unwrap old `declaration:` wrapper
    names: set[str] = set()
    json_fields: list[str] = []
    shapes: list[str] = []

    # old: allowlist.body / allowlist.params
    allow = d.get("allowlist") or {}
    for key in ("body", "params"):
        lst = allow.get(key)
        if isinstance(lst, list):
            shapes.append(f"allowlist.{key}")
            for f in lst:
                if isinstance(f, dict) and "field" in f:
                    names.add(f["field"])
                    if f.get("type") == "json":
                        json_fields.append(f["field"])

    # old: accepts: as a list of {field,type}  (2 ljvis files)
    acc = d.get("accepts")
    if isinstance(acc, list):
        shapes.append("accepts[list]")
        for f in acc:
            if isinstance(f, dict) and "field" in f:
                names.add(f["field"])
                if f.get("type") == "json":
                    json_fields.append(f["field"])

    # new: params: mapping
    params = d.get("params")
    if isinstance(params, dict):
        shapes.append("params[new]")
        for name, spec in params.items():
            names.add(name)
            if isinstance(spec, dict) and spec.get("type") == "json":
                json_fields.append(name)

    if not shapes:
        shapes.append("param-less")

    return names, "+".join(shapes), json_fields


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sql-dir", default="DSL/Resql")
    ap.add_argument("--json-out", default="scripts/.resql-audit.json")
    args = ap.parse_args()

    root = Path(args.sql_dir)
    files = sorted(root.rglob("*.sql"))
    if not files:
        sys.exit(f"no .sql under {root}")

    rows = []
    for f in files:
        raw = f.read_text(encoding="utf-8")
        rec: dict = {"file": str(f)}
        block, body = extract_block(raw)
        if block is None:
            rec["parse"] = "NO /* */ BLOCK"
            rows.append(rec)
            continue
        rec["non_ascii_in_block"] = bool(re.search(r"[^\x00-\x7f]", block))
        try:
            decl = yaml.safe_load(block) or {}
        except yaml.YAMLError as e:
            rec["parse"] = f"YAML ERROR: {str(e).splitlines()[0]}"
            rows.append(rec)
            continue
        if not isinstance(decl, dict):
            rec["parse"] = "block is not a mapping"
            rows.append(rec)
            continue

        rec["parse"] = "ok"
        has_wrapper = "declaration" in decl
        rec["wrapper"] = has_wrapper
        names, shape, json_fields = declared_params(decl)
        rec["shape"] = shape
        rec["type_json_fields"] = json_fields
        d = decl.get("declaration", decl)
        rec["has_response_block"] = "response" in d or "returns" in d and isinstance(d.get("returns"), list)

        ref = referenced_params(body)
        rec["declared"] = sorted(names)
        rec["referenced"] = ref
        missing = [r for r in ref if r not in names]   # :name in SQL, not declared -> boot fatal
        orphan = sorted(n for n in names if n not in ref)  # declared, never used -> boot fatal
        rec["missing_in_decl"] = missing
        rec["orphan_in_decl"] = orphan
        rec["boot_fatal"] = bool(missing or orphan)
        rec["param_less"] = not names and not ref
        rows.append(rec)

    Path(args.json_out).write_text(json.dumps(rows, indent=2, ensure_ascii=False))

    # ---- summary ----
    total = len(rows)
    wrapper = sum(1 for r in rows if r.get("wrapper"))
    param_less = sum(1 for r in rows if r.get("param_less"))
    type_json = [r for r in rows if r.get("type_json_fields")]
    boot_fatal = [r for r in rows if r.get("boot_fatal")]
    non_ascii = sum(1 for r in rows if r.get("non_ascii_in_block"))
    bad_parse = [r for r in rows if r.get("parse") != "ok"]
    shapes: dict[str, int] = {}
    for r in rows:
        shapes[r.get("shape", "?")] = shapes.get(r.get("shape", "?"), 0) + 1

    print(f"# Resql declaration audit — {total} .sql files under {root}\n")
    print(f"  declaration: wrapper        {wrapper}")
    print(f"  param-less                  {param_less}")
    print(f"  non-ASCII in decl block     {non_ascii}")
    print(f"  block parse failures        {len(bad_parse)}")
    print(f"  type: json fields           {len(type_json)} files")
    print(f"  :name/declared MISMATCH     {len(boot_fatal)} files  (boot-fatal on 0.2.0)")
    print("\n  shapes:")
    for s, c in sorted(shapes.items(), key=lambda kv: -kv[1]):
        print(f"    {c:4}  {s}")

    if type_json:
        print("\n  type: json  (must become type: object):")
        for r in type_json:
            print(f"    {r['file']}  -> {r['type_json_fields']}")

    if boot_fatal:
        print("\n  :name / declaration MISMATCH  (manual fix in PR-2):")
        for r in boot_fatal:
            if r["missing_in_decl"]:
                print(f"    {r['file']}  MISSING in decl: {r['missing_in_decl']}")
            if r["orphan_in_decl"]:
                print(f"    {r['file']}  ORPHAN in decl:  {r['orphan_in_decl']}")

    if bad_parse:
        print("\n  block parse failures:")
        for r in bad_parse:
            print(f"    {r['file']}  {r['parse']}")

    print(f"\n  full JSON -> {args.json_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
