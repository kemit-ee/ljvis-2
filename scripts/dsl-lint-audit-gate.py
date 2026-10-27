#!/usr/bin/env python3
"""Gate `dsl-lint --audit` warnings against a reviewed baseline.

`dsl-lint --audit` exits non-zero only on error-severity findings. This reads
its output on stdin and fails on

  - any warning that is not in the baseline (new route without `returns:`,
    new body field without `type:`, ...), and
  - any baseline entry that no longer fires (so the baseline only shrinks).

Usage:
  dsl-lint --dsl DSL/Ruuter --constants constants.ini --audit \
    | python3 scripts/dsl-lint-audit-gate.py scripts/dsl-lint-audit-baseline.public.txt
  ... | python3 scripts/dsl-lint-audit-gate.py BASELINE --update   # rewrite baseline
"""

from __future__ import annotations

import re
import sys

ANSI = re.compile(r"\x1b\[[0-9;]*m")
DECL = re.compile(r"^warn\s+(\S+): \[(declaration[\w.]*)\].*?(?:fields: (\[.*\]))?$")


def key(line: str) -> str:
    m = DECL.match(line)
    if m:
        return f"{m.group(1)} [{m.group(2)}] {m.group(3) or ''}".strip()
    text = re.sub(r"line \d+: ", "", line[len("warn"):])
    return re.sub(r"\s+", " ", text.strip())[:160]


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    update = "--update" in sys.argv
    if len(args) != 1:
        sys.exit(__doc__)
    baseline_path = args[0]
    seen = sorted(
        {
            key(ln)
            for ln in (ANSI.sub("", raw).rstrip("\n") for raw in sys.stdin)
            if ln.startswith("warn")
        }
    )
    if update:
        with open(baseline_path, "w") as fh:
            fh.write("".join(f"{k}\n" for k in seen))
        print(f"baseline written: {len(seen)} entries")
        return 0
    with open(baseline_path) as fh:
        baseline = {ln.rstrip("\n") for ln in fh if ln.strip()}
    new = [k for k in seen if k not in baseline]
    stale = sorted(baseline - set(seen))
    for k in new:
        print(f"::error::new dsl-lint audit warning: {k}")
    for k in stale:
        print(f"::error::baseline entry no longer fires, remove it: {k}")
    print(f"dsl-lint audit gate: {len(seen)} warnings, {len(new)} new, {len(stale)} stale")
    return 1 if new or stale else 0


if __name__ == "__main__":
    sys.exit(main())
