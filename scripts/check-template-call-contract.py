#!/usr/bin/env python3
"""Check that every `template:` call only sends body keys and headers the target template declares.

Ruuter silently drops undeclared body keys (or, with `declaration.strict: true`,
answers 400). Either way a caller that keeps sending a removed field is a bug:
this script makes it a CI failure instead of a silent no-op / production 400.

Targets without `allowlist.body` are skipped (nothing declared to compare with).
Run from the repo root:  python3 scripts/check-template-call-contract.py
"""
import glob
import sys

import yaml

ROOTS = ["DSL/Ruuter/ljvis", "DSL/Ruuter.internal/ljvis"]


def load(path):
    try:
        with open(path, encoding="utf-8") as f:
            return yaml.safe_load(f)
    except Exception:
        return None


def declared_body(doc):
    al = ((doc or {}).get("declaration") or {}).get("allowlist")
    if not isinstance(al, dict) or "body" not in al:
        return None
    return {f.get("field") for f in (al["body"] or []) if isinstance(f, dict)}


def declared_headers(doc):
    al = ((doc or {}).get("declaration") or {}).get("allowlist")
    if not isinstance(al, dict) or "headers" not in al:
        return None
    return {f.get("field") for f in (al["headers"] or []) if isinstance(f, dict)}


def main():
    errors = []
    for root in ROOTS:
        tmpl_root = f"{root}/GET/"
        for path in glob.glob(f"{root}/**/*.yml", recursive=True):
            doc = load(path)
            if not isinstance(doc, dict):
                continue
            for step, spec in doc.items():
                if not isinstance(spec, dict) or "template" not in spec:
                    continue
                target = load(f"{tmpl_root}{spec['template']}.yml")
                declared = declared_body(target)
                hdrs = declared_headers(target)
                if hdrs is not None and isinstance(spec.get("headers"), dict):
                    for key in spec["headers"]:
                        if key.lower() not in {h.lower() for h in hdrs}:
                            errors.append(f"{path}: step '{step}' sends header '{key}' not declared by {spec['template']}")
                body = spec.get("body")
                if declared is None or not isinstance(body, dict):
                    continue
                for key in body:
                    if key not in declared:
                        errors.append(f"{path}: step '{step}' sends '{key}' not declared by {spec['template']}")
    for e in sorted(errors):
        print(e)
    print(f"{len(errors)} undeclared template-call body key(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
