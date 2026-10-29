"""DMapper text-safety invariant.

Every plain "{{this.x}}" string interpolation in a DMapper template must be listed in
tests/contract/dmapper-plain-fields.txt, per template file and field. Free text uses {{{json this.x}}}, which
JSON-escapes the value.
A plain interpolation HTML-escapes only, so a backslash or a tab in the value breaks the JSON response.
"""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
TEMPLATES = "DSL/DMapper/ljvis/hbs"
ALLOWLIST = "tests/contract/dmapper-plain-fields.txt"
PLAIN = re.compile(r'"\{\{this\.([\w.]+)\}\}"')


def load_allowlist(root: Path):
    path = root / ALLOWLIST
    if not path.is_file():
        return set()
    lines = (line.split("#", 1)[0].split() for line in path.read_text(encoding="utf-8").splitlines())
    return {(line[0], line[1]) for line in lines if len(line) == 2}


def check(root: Path = ROOT):
    allowed = load_allowlist(root)
    used, errors = set(), []
    for template in sorted((root / TEMPLATES).glob("*.handlebars")):
        for number, line in enumerate(template.read_text(encoding="utf-8").splitlines(), 1):
            for field in PLAIN.findall(line):
                used.add((template.name, field))
                if (template.name, field) not in allowed:
                    errors.append(f'{template.relative_to(root)}:{number}: "{{{{this.{field}}}}}" is not JSON-escaped; '
                                  f"use {{{{{{json this.{field}}}}}}} or list '{template.name} {field}' in {ALLOWLIST}")
    for name, field in sorted(allowed - used):
        errors.append(f"{ALLOWLIST}: {name} {field} is listed but the template does not use it as a plain interpolation - remove it")
    return errors


def main():
    errors = check()
    for error in errors:
        print(error)
    print("DMapper text-safety invariant: " + ("FAILED" if errors else "OK"))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
