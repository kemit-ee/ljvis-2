#!/usr/bin/env bash
# Lint that `docs/openapi.yaml` `operationId` set and
# `docs/permissions-matrix.md` §2 `operationId` set are equal, and that
# every operation has a non-empty `x-permissions` block.
#
# Fail loudly if drift is detected. Intended for CI + pre-commit.
#
# Requires: python3, PyYAML.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
OPENAPI="$REPO_ROOT/docs/openapi.yaml"
MATRIX="$REPO_ROOT/docs/permissions-matrix.md"

if [[ ! -f "$OPENAPI" || ! -f "$MATRIX" ]]; then
  echo "expected $OPENAPI and $MATRIX to exist" >&2
  exit 2
fi

python3 - "$OPENAPI" "$MATRIX" <<'PY'
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("PyYAML is required (pip install pyyaml)", file=sys.stderr)
    sys.exit(2)

openapi_path = Path(sys.argv[1])
matrix_path  = Path(sys.argv[2])

doc = yaml.safe_load(openapi_path.read_text())

api_ops   = {}
no_xperm  = []
for path, ops in (doc.get("paths") or {}).items():
    for method, op in (ops or {}).items():
        if method not in ("get", "post", "put", "delete", "patch"):
            continue
        opid = op.get("operationId")
        if not opid:
            print(f"missing operationId at {method.upper()} {path}", file=sys.stderr)
            sys.exit(1)
        api_ops[opid] = f"{method.upper()} {path}"
        xperm = op.get("x-permissions") or {}
        # Accept either { public: true } or { anyOf: [...] } (non-empty).
        if xperm.get("public") is True:
            continue
        any_of = xperm.get("anyOf")
        if not (isinstance(any_of, list) and len(any_of) > 0):
            no_xperm.append(opid)

# Extract operationIds from matrix §2 tables. operationIds are camelCase
# (e.g. `getUser`, `postClassifierValue`); require at least one uppercase
# letter to skip §1 resource/action code cells like `user`, `classifier`,
# `list`, `create`.
matrix_ops = set(re.findall(r"\|\s*`([a-z][A-Za-z0-9]*[A-Z][A-Za-z0-9]*)`\s*\|", matrix_path.read_text()))

api_set    = set(api_ops.keys())
uncovered  = sorted(api_set - matrix_ops)
stale      = sorted(matrix_ops - api_set)

errors = 0
if no_xperm:
    print(f"[FAIL] {len(no_xperm)} operations missing x-permissions:", file=sys.stderr)
    for o in sorted(no_xperm):
        print(f"       {o}  ({api_ops[o]})", file=sys.stderr)
    errors += 1
if uncovered:
    print(f"[FAIL] {len(uncovered)} openapi operationIds not in permissions matrix §2:", file=sys.stderr)
    for o in uncovered:
        print(f"       {o}  ({api_ops[o]})", file=sys.stderr)
    errors += 1
if stale:
    print(f"[FAIL] {len(stale)} permissions matrix operationIds not in openapi:", file=sys.stderr)
    for o in stale:
        print(f"       {o}", file=sys.stderr)
    errors += 1

if errors:
    print(f"\n{errors} lint failure(s). Fix docs/openapi.yaml and docs/permissions-matrix.md before committing.", file=sys.stderr)
    sys.exit(1)

print(f"[OK] {len(api_ops)} operations; every path has x-permissions and matches permissions matrix §2.")
PY
