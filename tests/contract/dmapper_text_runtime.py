"""DMapper runtime check: free text survives every template unchanged and never breaks the JSON response.

For each template this builds a request from the fields the template reads. Fields written with
{{{json this.x}}} get hostile text (backslash, tab, quotes, HTML, a JSON injection attempt). The response
must be valid JSON, must keep the same keys as a response to harmless input, and must return the text as sent.

Usage: DMAPPER_URL=http://localhost:3005 python3 tests/contract/dmapper_text_runtime.py
"""
import json
import os
from pathlib import Path
import re
import sys
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
TEMPLATES = ROOT / "DSL/DMapper/ljvis/hbs"
URL = os.environ.get("DMAPPER_URL", "http://localhost:3005")
HOSTILE = {
    "backslash": "Foo\\",
    "tab": "a\tb",
    "html": "<b>x</b> & \"q\" 's'",
    "injection": 'x", "injected": "yes", "y": "',
    "unicode": "Õäöü Šž",
}


def post(view, body):
    request = urllib.request.Request(f"{URL}/ljvis/{view}", json.dumps(body).encode(),
                                     {"Content-Type": "application/json", "x-internal-service-token": "test"})
    try:
        return urllib.request.urlopen(request, timeout=15).read().decode()
    except OSError:
        return None


def build(template, text_fields, hostile=None):
    root = re.search(r"#(?:with|each) (\w+)", template).group(1)
    item, top = {}, {}
    for name in set(re.findall(r"this\.(\w+)", template)):
        item[name] = "x"
    for name in re.findall(r"\{\{\{this\.(\w+)\}\}\}", template):
        item[name] = "[]"
    for name in re.findall(r'(?<![{"])\{\{this\.(\w+)\}\}(?![}"])', template):
        item[name] = 0
    for name in re.findall(r"\{\{(?![#/^!>~])(?!this\b)([a-zA-Z_]\w*)\}\}", template):
        item.setdefault(name, 0)
        top.setdefault(name, 0)
    for name in re.findall(r"\{\{\{?\.\./(\w+)\}\}\}?", template):
        top[name] = "[]"
    if hostile is not None:
        for name in text_fields:
            item[name] = hostile
    return {root: [item], **top}


def keys(value, prefix=""):
    if isinstance(value, dict):
        for key, child in value.items():
            yield prefix + "/" + key
            yield from keys(child, prefix + "/" + key)
    elif isinstance(value, list):
        for child in value:
            yield from keys(child, prefix + "[]")


def strings(value):
    if isinstance(value, dict):
        for child in value.values():
            yield from strings(child)
    elif isinstance(value, list):
        for child in value:
            yield from strings(child)
    elif isinstance(value, str):
        yield value


def main():
    problems, checked = [], 0
    for path in sorted(TEMPLATES.glob("*.handlebars")):
        template = path.read_text(encoding="utf-8")
        text_fields = sorted(set(re.findall(r"\{\{\{json this\.(\w+)\}\}\}", template)))
        if not text_fields:
            continue
        try:
            base = json.loads(post(path.stem, build(template, text_fields)) or "")
        except ValueError:
            problems.append(f"{path.name}: harmless input does not give valid JSON (the test cannot build an input for this template)")
            continue
        checked += 1
        for label, text in HOSTILE.items():
            response = post(path.stem, build(template, text_fields, text))
            try:
                data = json.loads(response or "")
            except ValueError:
                problems.append(f"{path.name}: {label} text gives invalid JSON")
                continue
            if set(keys(data)) != set(keys(base)):
                problems.append(f"{path.name}: {label} text changes the response keys")
            elif text not in set(strings(data)):
                problems.append(f"{path.name}: {label} text does not come back unchanged")
    for problem in problems:
        print(problem)
    print(f"DMapper text runtime check: {checked} templates, " + ("FAILED" if problems or not checked else "OK"))
    return 1 if problems or not checked else 0


if __name__ == "__main__":
    sys.exit(main())
