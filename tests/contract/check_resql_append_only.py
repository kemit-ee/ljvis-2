#!/usr/bin/env python3
"""Static guard for the SQL append-only invariant (epic #522, task T4).

Every Resql template under DSL/Resql/ must be INSERT + SELECT only:

  A1  no UPDATE / DELETE / TRUNCATE / MERGE         (rows are never mutated or removed)
  A2  no JOIN / LATERAL                             (use `= ANY(SELECT ...)` / `EXISTS`)
  A3  no ON CONFLICT ... DO UPDATE                  (plain DO NOTHING stays allowed; DO UPDATE is
                                                    caught by A1 because it contains UPDATE)
  A4  the `/* ... */` YAML header parses              (Resql reads it at boot; a stray `: ` in a
                                                    description breaks the template)

`SELECT ... FOR UPDATE` is a row lock, not a write, and is not flagged.

Comments (`/* */`, `--`), string literals and dollar-quoted bodies are stripped before
matching, so prose in the YAML header never trips the rule.

The only sanctioned exception is the retention-purge DELETE described in the epic
(archive-move -> verify -> delete). It must be listed in `.sql-rule-exemption` with the
exact file path and a rationale; an exemption that no longer matches a violation is an
error, so the allowlist cannot rot.

Run from the repo root:  python3 tests/contract/check_resql_append_only.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    sys.exit("pyyaml required: pip install pyyaml")

ROOT = Path(__file__).resolve().parents[2]
SQL_ROOT = "DSL/Resql"
EXEMPTION_FILE = ".sql-rule-exemption"

RULES = (
    ("A1", re.compile(r"\b(UPDATE|DELETE|TRUNCATE|MERGE)\b", re.I),
     "mutating statement ({0}) — append a new row instead"),
    ("A2", re.compile(r"\b(JOIN|LATERAL)\b", re.I),
     "{0} — use `= ANY(SELECT ...)` or `EXISTS` instead"),
)

FOR_LOCK = re.compile(r"\bFOR\s+(?:NO\s+KEY\s+)?$", re.I)

_STRIP = re.compile(
    r"""
      /\*.*?\*/                  # block comment (YAML header)
    | --[^\n]*                   # line comment
    | \$(\w*)\$.*?\$\1\$         # dollar-quoted body
    | '(?:[^']|'')*'             # string literal
    | "(?:[^"]|"")*"             # quoted identifier
    """,
    re.S | re.X,
)


def strip_sql(text: str) -> str:
    """Blank out comments and literals but keep newlines so line numbers survive."""
    return _STRIP.sub(lambda m: re.sub(r"[^\n]", " ", m.group(0)), text)


HEADER = re.compile(r"\A\s*/\*\n(.*?)\n\*/", re.S)


def header_problem(text: str):
    m = HEADER.match(text)
    if not m:
        return "missing `/* ... */` YAML header"
    try:
        yaml.safe_load(m.group(1))
    except yaml.YAMLError as e:
        return "YAML header does not parse: " + str(e).splitlines()[0]
    return None


def violations(text: str):
    """Return [(rule, line_no, message)] for one template."""
    clean = strip_sql(text)
    found = []
    for rule, rx, msg in RULES:
        for m in rx.finditer(clean):
            if FOR_LOCK.search(clean[: m.start()]) and m.group(1).upper() == "UPDATE":
                continue  # SELECT ... FOR [NO KEY] UPDATE is a lock, not a write
            line = clean.count("\n", 0, m.start()) + 1
            found.append((rule, line, msg.format(m.group(1).upper())))
    return sorted(found, key=lambda v: (v[1], v[0]))


def load_exemptions(root: Path):
    """`<repo-relative path>  # rationale` per line; blank lines and `#` lines ignored."""
    path = root / EXEMPTION_FILE
    out, errors = {}, []
    if not path.exists():
        return out, errors
    for n, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        target, _, why = line.partition("#")
        target, why = target.strip(), why.strip()
        if not why:
            errors.append(f"{EXEMPTION_FILE}:{n}: exemption for {target} has no rationale")
        elif not target.startswith(SQL_ROOT + "/archive/") and not target.startswith(SQL_ROOT + "/ljvis/POST/archive/"):
            errors.append(f"{EXEMPTION_FILE}:{n}: {target} is outside DSL/Resql/*/POST/archive/ "
                          "(only a retention-purge DELETE may be exempt)")
        else:
            out[target] = why
    return out, errors


def check(root: Path = ROOT):
    errors = []
    exemptions, ex_errors = load_exemptions(root)
    errors += ex_errors
    used = set()
    for path in sorted((root / SQL_ROOT).rglob("*.sql")):
        rel = path.relative_to(root).as_posix()
        text = path.read_text(encoding="utf-8")
        problem = header_problem(text)
        if problem:
            errors.append(f"{rel}: A4 {problem}")
        found = violations(text)
        if not found:
            continue
        if rel in exemptions:
            if any(v[0] != "A1" or "DELETE" not in v[2] for v in found):
                errors.append(f"{rel}: exempt, but violates more than the retention DELETE: "
                              + "; ".join(f"{r}@{n} {m}" for r, n, m in found))
            used.add(rel)
            continue
        errors += [f"{rel}:{n}: {r} {m}" for r, n, m in found]
    for stale in sorted(set(exemptions) - used):
        errors.append(f"{EXEMPTION_FILE}: {stale} is exempt but has no violation (or does not exist) — remove it")
    return errors


def main() -> int:
    errors = check()
    if errors:
        print("SQL append-only invariant violated (epic #522):\n")
        print("\n".join(errors))
        print(f"\n{len(errors)} problem(s). See tests/contract/README.md ('SQL append-only invariant').")
        return 1
    print("SQL append-only invariant: OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
