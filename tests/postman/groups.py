#!/usr/bin/env python3
"""List one isolated API test group. Reject missing or duplicate collections."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def groups():
    plan = json.loads((ROOT / 'groups.json').read_text())
    entries = [name for names in plan.values() for name in names]
    actual = {p.name.removesuffix('.collection.json') for p in (ROOT / 'collections').glob('*.collection.json')}
    if len(entries) != len(set(entries)) or set(entries) != actual:
        raise SystemExit(f'Invalid API groups: missing={sorted(actual-set(entries))}, unknown={sorted(set(entries)-actual)}, duplicates={len(entries)-len(set(entries))}')
    return plan


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('group', nargs='?', default='all')
    args = parser.parse_args()
    plan = groups()
    if args.group == 'all':
        print(' '.join(name for names in plan.values() for name in names))
    elif args.group in plan:
        print(' '.join(plan[args.group]))
    else:
        parser.error(f'Unknown group {args.group!r}; choose all or {", ".join(plan)}')
