#!/usr/bin/env python3
"""Resql reuses its prepared statements, so PostgreSQL may run a query with a generic plan, in which the parameter
value is unknown. A jsonb containment with a parameter (`col @> jsonb_build_object('k', :param)`) then gets only a
default selectivity estimate. Inside EXISTS or with LIMIT, the planner can prefer a linear scan that stops early, and
the GIN index is not used: erru/nu/audit-event-exists scanned the whole audit.audit_event table (552 ms at 600k rows,
330 ms on average in the ljvis2-test load test) until it used `log_content->>'key' = :param` with a partial
expression index (PR #775).

Rule: a jsonb containment whose right side is built from a Resql parameter is allowed only in the files listed in
ALLOWED, each with the reason why the generic plan was checked. For a single key, prefer `col->>'key' = :param` with
an expression index.
"""
import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]

# path -> why the generic plan was checked and is acceptable
ALLOWED = {
    'DSL/Resql/ljvis/POST/xroad/provide/isiku-kontroll.sql':
        'drivers is an array of driver objects (no single-key expression index fits); not inside EXISTS or LIMIT; '
        'generic plan checked to use idx_cf_drivers_gin (bitmap scan, 0.07 ms at 400k rows).',
    'DSL/Resql/ljvis/POST/xroad/provide/isiku-ettevote-kontrollid.sql':
        'same drivers containment as isiku-kontroll.sql; generic plan checked to use idx_cf_drivers_gin.',
}

COMMENT = re.compile(r'/\*.*?\*/|--[^\n]*', re.S)
CONTAINMENT = re.compile(r'@>\s*\(?\s*jsonb_build_(?:object|array)\s*\(([^;]*?)\)', re.S | re.I)
PARAM = re.compile(r'(?<!:):[A-Za-z_]\w*')


def violations():
    found = []
    for path in sorted((ROOT / 'DSL/Resql').rglob('*.sql')):
        rel = str(path.relative_to(ROOT))
        body = COMMENT.sub(lambda m: re.sub(r'[^\n]', ' ', m.group(0)), path.read_text())
        for hit in CONTAINMENT.finditer(body):
            if PARAM.search(hit.group(1)) and rel not in ALLOWED:
                line = body[:hit.start()].count('\n') + 1
                found.append(f'{rel}:{line}: jsonb containment with a parameter')
    return found


def stale_allowlist():
    return [rel for rel in ALLOWED
            if not (ROOT / rel).exists()
            or not any(PARAM.search(h.group(1)) for h in CONTAINMENT.finditer(COMMENT.sub(' ', (ROOT / rel).read_text())))]


class JsonbContainmentParam(unittest.TestCase):
    def test_real_repository_is_clean(self):
        self.assertEqual(violations(), [])

    def test_allowlist_is_not_stale(self):
        self.assertEqual(stale_allowlist(), [])


if __name__ == '__main__':
    unittest.main()
