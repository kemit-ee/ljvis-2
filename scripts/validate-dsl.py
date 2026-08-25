#!/usr/bin/env python3
"""Static validation of the Bürokratt Ruuter DSL and the SQL files.

Ported from the GitHub Actions `validate-dsl` job. Sonar does not understand the
Ruuter DSL, so this is the only check that catches a broken flow before the image is
built. Five checks:

  1. every Ruuter YAML file parses;
  2. no step is unreachable and no `next` reference dangles;
  3. the declaration block is one Rust Ruuter will accept;
  4. no SQL file is empty;
  5. no `assign` block reads a key it sets itself (warning only, see check 5).

Mock DSL files (any path containing /mock/) are excluded: they are deliberate stubs.

Usage:
    python3 scripts/validate-dsl.py            # run from the repository root
    python3 scripts/validate-dsl.py --root .   # explicit root

Exit code 0 = all checks passed, 1 = at least one failure.
"""

from __future__ import annotations

import argparse
import glob
import os
import re
import sys

import yaml

RUUTER_GLOBS = ("DSL/Ruuter/**/*.yml", "DSL/Ruuter.internal/**/*.yml")
SQL_DIRS = ("DSL/Resql", "DSL/Liquibase/changelog")
# `${...}` payloads only, so a plain string value cannot look like a variable reference.
EXPRESSION_RE = re.compile(r"\$\{([^}]*)\}")


def ruuter_files() -> list[str]:
    found: list[str] = []
    for pattern in RUUTER_GLOBS:
        found.extend(p for p in glob.glob(pattern, recursive=True) if "/mock/" not in p)
    return sorted(found)


def collect_next_refs(obj) -> set[str]:
    """Every string value of a `next` key, at any depth."""
    refs: set[str] = set()
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key == "next" and isinstance(value, str):
                refs.add(value)
            else:
                refs |= collect_next_refs(value)
    elif isinstance(obj, list):
        for item in obj:
            refs |= collect_next_refs(item)
    return refs


def has_next_key(obj) -> bool:
    if isinstance(obj, dict):
        if "next" in obj:
            return True
        return any(has_next_key(v) for v in obj.values())
    if isinstance(obj, list):
        return any(has_next_key(item) for item in obj)
    return False


def check_parses(paths: list[str]) -> tuple[list[str], dict[str, dict]]:
    """Parse every file. Returns (errors, {path: parsed mapping})."""
    errors: list[str] = []
    parsed: dict[str, dict] = {}
    for path in paths:
        try:
            with open(path, encoding="utf-8") as handle:
                data = yaml.safe_load(handle)
        except yaml.YAMLError as exc:
            errors.append(f"{path}: {exc}")
            continue
        if isinstance(data, dict):
            parsed[path] = data
    return errors, parsed


def check_flow(parsed: dict[str, dict]) -> list[str]:
    """Unreachable steps and dangling `next` targets.

    A step without any `next` key falls through to the next step in document order,
    which is how Ruuter executes a linear flow.
    """
    errors: list[str] = []
    for path, data in parsed.items():
        steps = {k: v for k, v in data.items() if k != "declaration"}
        if not steps:
            continue
        names = list(steps)
        adjacency: dict[str, set[str]] = {}
        for index, name in enumerate(names):
            refs = collect_next_refs(steps[name]) - {"end"}
            if not has_next_key(steps[name]) and index + 1 < len(names):
                refs = {names[index + 1]}
            adjacency[name] = refs

        visited: set[str] = set()
        queue = [names[0]]
        while queue:
            current = queue.pop()
            if current in visited:
                continue
            visited.add(current)
            queue.extend(r for r in adjacency.get(current, set()) if r in steps and r not in visited)

        dead = [s for s in steps if s not in visited]
        if dead:
            errors.append(f"{path}: unreachable steps: {dead}")

        all_refs: set[str] = set()
        for body in steps.values():
            all_refs |= collect_next_refs(body) - {"end"}
        dangling = sorted(r for r in all_refs if r not in steps)
        if dangling:
            errors.append(f"{path}: dangling next references: {dangling}")
    return errors


def check_declaration(parsed: dict[str, dict]) -> list[str]:
    """The declaration block as Rust Ruuter will accept it.

    Rust Ruuter parses every top-level key as a step and matches it against an untagged
    enum, so a `call:` inside `declaration:` makes it try to read the block as a step and
    fail with "data did not match any variant of untagged enum DslStep" — at startup, for
    the whole container, naming no file. The Java build ignored the key.

    `version` has to be a string too: 1.0 unquoted is a YAML float, and the field is typed.
    """
    errors: list[str] = []
    for path, data in parsed.items():
        decl = data.get("declaration")
        if not isinstance(decl, dict):
            continue
        if "call" in decl:
            errors.append(f"{path}: declaration has `call: {decl['call']}` — Rust Ruuter reads it as a step")
        version = decl.get("version")
        if version is not None and not isinstance(version, str):
            errors.append(f"{path}: declaration version {version!r} is not a string — quote it")
    return errors


def check_assign_blocks(parsed: dict[str, dict]) -> list[str]:
    """One key of an `assign` block reading another key of the same block.

    Rust Ruuter keeps the step map in an IndexMap but a single `assign` block in a
    std HashMap, and its book states the evaluation order inside one block is undefined.
    The referenced key may therefore not be set yet, and only variables already set are
    bound onto globalThis (src/scripting/quickjs.rs), so the expression reads an
    undeclared identifier, JavaScript raises a ReferenceError and the engine halts the
    run. The map seed is drawn per process, so the same DSL can serve requests for weeks
    and then fail for a whole pod lifetime after a restart.

    Reported as a warning, not a failure: this repository has ~190 of these, mostly in
    the audit and changed-field templates, and blocking the pipeline on all of them is
    not this script's call to make.
    """
    warnings: list[str] = []
    for path, data in parsed.items():
        for step_name, body in data.items():
            if step_name == "declaration" or not isinstance(body, dict):
                continue
            block = body.get("assign")
            if not isinstance(block, dict):
                continue
            keys = [k for k in block if isinstance(k, str)]
            for key in keys:
                expressions = " ".join(EXPRESSION_RE.findall(str(block[key])))
                for other in keys:
                    # A dotted prefix (`user_profile.user_id`) is a field, not the variable.
                    if other != key and re.search(rf"(?<![\w.]){re.escape(other)}\b", expressions):
                        warnings.append(
                            f"{path}: step `{step_name}` assigns `{key}` from `{other}`,"
                            " which the same assign block sets — split into two assign steps"
                        )
    return warnings


def check_sql_non_empty() -> tuple[list[str], int]:
    errors: list[str] = []
    total = 0
    for directory in SQL_DIRS:
        if not os.path.isdir(directory):
            continue
        for path in sorted(glob.glob(os.path.join(directory, "**", "*.sql"), recursive=True)):
            total += 1
            if os.path.getsize(path) == 0:
                errors.append(f"{path}: empty SQL file")
    return errors, total


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".", help="Repository root (default: current directory)")
    args = parser.parse_args()
    os.chdir(args.root)

    paths = ruuter_files()
    if not paths:
        print("FAIL  no Ruuter DSL files found — is --root the repository root?")
        return 1

    parse_errors, parsed = check_parses(paths)
    flow_errors = check_flow(parsed) if not parse_errors else []
    decl_errors = check_declaration(parsed) if not parse_errors else []
    assign_warnings = check_assign_blocks(parsed) if not parse_errors else []
    sql_errors, sql_total = check_sql_non_empty()

    failed = False
    if parse_errors:
        failed = True
        print(f"FAIL  Ruuter YAML parse ({len(parse_errors)})")
        for error in parse_errors:
            print(f"        {error}")
    else:
        print(f"OK    {len(paths)} Ruuter YAML files parse (mock files excluded)")

    if flow_errors:
        failed = True
        print(f"FAIL  Ruuter DSL flow ({len(flow_errors)})")
        for error in flow_errors:
            print(f"        {error}")
    elif not parse_errors:
        print(f"OK    {len(parsed)} Ruuter flows: no unreachable steps, no dangling next")

    if decl_errors:
        failed = True
        print(f"FAIL  declaration block not Rust Ruuter compatible ({len(decl_errors)})")
        for error in decl_errors:
            print(f"        {error}")
    elif not parse_errors:
        print(f"OK    {len(parsed)} declaration blocks: no `call`, version is a string")

    if assign_warnings:
        print(f"WARN  assign block evaluation order ({len(assign_warnings)}) — does not fail the build")
        for warning in assign_warnings:
            print(f"        {warning}")
    elif not parse_errors:
        print(f"OK    {len(parsed)} flows: no assign block reads a key it sets")

    if sql_errors:
        failed = True
        print(f"FAIL  empty SQL files ({len(sql_errors)})")
        for error in sql_errors:
            print(f"        {error}")
    else:
        print(f"OK    {sql_total} SQL files non-empty")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
