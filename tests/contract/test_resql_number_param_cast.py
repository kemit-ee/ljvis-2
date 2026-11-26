#!/usr/bin/env python3
"""A Resql parameter of `type: number` is bound as a numeric value. Compared with a BIGINT or INTEGER
column, numeric is not in the same btree operator family, so PostgreSQL cannot use the index directly
and scans the whole index (erru.xml_inbox, xml-inbox/finish: 10 ms instead of 0.09 ms at 300k rows,
over 1 s in the ljvis2-test load test). This holds for every operator (=, <>, <, >, BETWEEN, IN, ANY).

Rule: an id or key parameter is `type: integer` with a cast (`:id::bigint`), as agreed in the Resql 0.2.0
migration (PR #251). A `type: number` parameter must always be cast (`:x::numeric`, `:x::int`) wherever it
is used. The only exception is a bare output column (`:page AS page`), which compares nothing.
"""
import pathlib
import re
import unittest

import yaml

ROOT = pathlib.Path(__file__).resolve().parents[2]
HEADER = re.compile(r'\s*/\*\n(.*?)\n\*/', re.S)


def uncast_number_params():
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
            for hit in re.finditer(r':' + name + r'\b(?!\s*::)', body):
                if re.match(r'\s+AS\s+\w+\s*,?\s*$', body[hit.end():].split('\n', 1)[0], re.I):
                    continue  # bare output column
                line = text[:m.end() + hit.start()].count('\n') + 1
                found.append(f'{path.relative_to(ROOT)}:{line}: uncast number parameter :{name}')
    return found


class NumberParamCast(unittest.TestCase):
    def test_real_repository_is_clean(self):
        self.assertEqual(uncast_number_params(), [])


if __name__ == '__main__':
    unittest.main()
