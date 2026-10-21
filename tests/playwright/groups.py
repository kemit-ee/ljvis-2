#!/usr/bin/env python3
"""Print exact file selectors for a named UI group; reject missing or duplicate files."""
import argparse
import json
from pathlib import Path
import re

root = Path(__file__).resolve().parent
plan = json.loads((root / 'groups.json').read_text())
entries = [name for names in plan.values() for name in names]
actual = {p.name.removesuffix('.spec.ts') for p in (root / 'tests').glob('*.spec.ts')}
if len(entries) != len(set(entries)) or set(entries) != actual:
    raise SystemExit(f'Invalid UI groups: missing={sorted(actual-set(entries))}, unknown={sorted(set(entries)-actual)}, duplicates={len(entries)-len(set(entries))}')
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('group', choices=plan)
args = parser.parse_args()
for name in plan[args.group]:
    print('/' + re.escape(name + '.spec.ts') + '$')
