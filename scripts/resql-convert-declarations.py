#!/usr/bin/env python3
"""
resql-convert-declarations.py — SPIKE / THROWAWAY.

Mechanically converts DSL/Resql/**/*.sql leading declaration blocks from the
askendest/resql:0.1.0-alpha.5 shape

    /*
    declaration:
      version: 0.1
      description: "..."
      method: post
      namespace: user
      returns: json
      allowlist:
        body:
          - field: id
            type: string
      response:
        fields:
          - field: id
            type: string
    */

to the turnerrainer/resql:0.2.0-alpha shape

    /*
    description: "..."
    namespace: user
    params:
      id:
        type: string
        required: false
    returns:
      - name: id
        type: string
        nullable: true
    */

Rewrites files IN PLACE. Intended to be run on the spike branch, its output
reviewed, then `git checkout -- DSL/Resql` before the spike PR is opened.
PR-2 promotes a reviewed version of this to a kept script.

What it does NOT try to fix (left as-is, flagged on stderr):
  - :name in SQL not covered by the declaration, or orphan declared params
    (boot-fatal on 0.2.0 — needs a human). Run resql-audit-declarations.py.
  - `type: json` params bound into a scalar SQL position.
  - `default:` values (ljvis has none — asserts).

Usage:  python3 scripts/resql-convert-declarations.py [--sql-dir DSL/Resql] [--dry-run]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.exit("PyYAML required: pip install pyyaml")

TYPE_MAP = {"json": "object"}  # 0.2.0 has no `json` type; JSONB params are `object`
DROP_TOP = {"version", "method", "accepts", "returns"}  # `accepts`/`returns` only when scalar


def _fields_to_params(fields: list) -> dict:
    out: dict = {}
    for f in fields:
        if not isinstance(f, dict) or "field" not in f:
            continue
        name = f["field"]
        spec: dict = {"type": TYPE_MAP.get(f.get("type", "string"), f.get("type", "string")),
                      "required": False}
        if f.get("description"):
            spec["description"] = f["description"]
        assert "default" not in f, f"unexpected default in {name}"
        out[name] = spec
    return out


def _response_to_returns(resp: dict) -> list:
    fields = (resp or {}).get("fields") or []
    out = []
    for f in fields:
        if not isinstance(f, dict) or "field" not in f:
            continue
        out.append({
            "name": f["field"],
            "type": TYPE_MAP.get(f.get("type", "string"), f.get("type", "string")),
            "nullable": True,
        })
    return out


def convert_block(block_yaml: str, path: Path) -> tuple[str, list[str]]:
    warns: list[str] = []
    raw = yaml.safe_load(block_yaml)
    if not isinstance(raw, dict):
        raise ValueError("block is not a mapping")
    d = raw.get("declaration", raw)

    new: dict = {}
    if d.get("description"):
        new["description"] = d["description"]
    if d.get("namespace"):
        new["namespace"] = d["namespace"]

    params: dict = {}
    allow = d.get("allowlist") or {}
    for key in ("body", "params"):
        if isinstance(allow.get(key), list):
            params.update(_fields_to_params(allow[key]))
    if isinstance(d.get("accepts"), list):          # accepts-as-list variant
        params.update(_fields_to_params(d["accepts"]))
    new["params"] = params                          # always present, may be {}

    returns = _response_to_returns(d.get("response") or {})
    if returns:
        new["returns"] = returns

    body = yaml.safe_dump(new, sort_keys=False, allow_unicode=True,
                          default_flow_style=False, width=100)
    return "/*\n" + body + "*/", warns


def process(path: Path, dry: bool) -> tuple[bool, list[str]]:
    raw = path.read_text(encoding="utf-8")
    s = raw.lstrip()
    if not s.startswith("/*"):
        return False, [f"{path}: no leading /* */ block"]
    start = len(raw) - len(s)
    close = raw.find("*/", start + 2)
    if close == -1:
        return False, [f"{path}: unclosed /* */"]
    block = raw[start + 2 : close]
    tail = raw[close + 2 :]

    try:
        new_block, warns = convert_block(block, path)
    except Exception as e:  # noqa: BLE001
        return False, [f"{path}: convert failed: {e}"]

    new_content = new_block + tail
    if new_content == raw:
        return False, warns
    if not dry:
        path.write_text(new_content, encoding="utf-8")
    return True, warns


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sql-dir", default="DSL/Resql")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    files = sorted(Path(args.sql_dir).rglob("*.sql"))
    changed = 0
    all_warns: list[str] = []
    for f in files:
        did, warns = process(f, args.dry_run)
        changed += did
        all_warns += warns

    print(f"{'would convert' if args.dry_run else 'converted'}: {changed}/{len(files)}")
    if all_warns:
        print("\nflags (handle manually):", file=sys.stderr)
        for w in all_warns:
            print("  " + w, file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
