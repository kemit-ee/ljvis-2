#!/usr/bin/env python3
"""A Resql parameter of `type: number` is bound as a numeric value, not as bigint. A comparison such as
`id = :inboxId` against a BIGINT column then compares numeric with bigint: PostgreSQL cannot use the
bigint index directly and scans the whole index (erru.xml_inbox: 10 ms instead of 0.09 ms at 300k rows,
over 1 s in the ljvis2-test load test). Cast the parameter: `id = :inboxId::bigint`.

This test fails when a `type: number` parameter is compared with `=`, `<>` or `IN` without a cast.
"""
import pathlib
import re
import unittest

import yaml

ROOT = pathlib.Path(__file__).resolve().parents[2]
HEADER = re.compile(r'\s*/\*\n(.*?)\n\*/', re.S)


def uncast_number_comparisons():
    found = []
    for path in sorted((ROOT / 'DSL/Resql').rglob('*.sql')):
        text = path.read_text()
        m = HEADER.match(text)
        if not m:
            continue
        try:
            params = (yaml.safe_load(m.group(1)) or {}).get('params') or {}
        except yaml.YAMLError:
            continue  # check_resql_append_only.py reports a broken header
        body = text[m.end():]
        for name, spec in (params.items() if isinstance(params, dict) else []):
            if not isinstance(spec, dict) or spec.get('type') != 'number':
                continue
            left = re.compile(r'[\w.]+\s*(?:=|<>|!=|\bIN\b)\s*\(?\s*:' + name + r'\b(?!\s*::)', re.I)
            right = re.compile(r':' + name + r'\b(?!\s*::)\s*(?:=|<>|!=)\s*[\w.]+')
            for hit in list(left.finditer(body)) + list(right.finditer(body)):
                line = text[:m.end() + hit.start()].count('\n') + 1
                found.append(f'{path.relative_to(ROOT)}:{line}: {hit.group(0)}')
    return found


class NumberParamCast(unittest.TestCase):
    def test_real_repository_is_clean(self):
        self.assertEqual(uncast_number_comparisons(), [])


if __name__ == '__main__':
    unittest.main()
