"""Text length limits in Ruuter validation must equal the database column size.

The control-form save and confirm routes (and the shared foreign violation validation template) reject
a text field that is longer than its VARCHAR column. A limit above the column gives a database error (500)
instead of a 422. A limit below the column rejects a valid value. This check reads the column sizes from
a running PostgreSQL and compares them with every `returnMaxLength*` step.

Usage:
  python3 tests/contract/check_text_limits.py
  PSQL_CMD="docker compose -f docker-compose.ci.yml -p ljvis-ci exec -T database psql -X -U ljvis -d ljvis_db" \
    python3 tests/contract/check_text_limits.py
"""
from pathlib import Path
import os
import re
import shlex
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
RUUTER = ROOT / "DSL/Ruuter/ljvis"
RESQL = ROOT / "DSL/Resql/ljvis/POST"
DEFAULT_PSQL = "docker exec database psql -X -U ljvis -d ljvis_db"
QUERY = ("select table_schema||'.'||table_name, column_name, coalesce(character_maximum_length::text, 'text') "
         "from information_schema.columns where data_type in ('character varying', 'character', 'text')")
LIMIT = re.compile(r"length > (\d+)\}'?\n      next: returnMaxLength(\w+)\b")
FIELD = re.compile(r"^returnMaxLength(\w+):\n(?:  status: 422\n)?  return: '\{\"type\":\"VALIDATION_ERROR\",\"field\":\"(\w+)\"", re.M)


def snake(name):
    return re.sub(r"([A-Z])", lambda m: "_" + m.group(1).lower(), name)


def load_columns(psql_cmd):
    out = subprocess.run(shlex.split(psql_cmd) + ["-tAF|", "-c", QUERY], capture_output=True, text=True)
    if out.returncode != 0:
        sys.exit("cannot read the database columns: " + out.stderr.strip()[:300])
    columns = {}
    for line in out.stdout.splitlines():
        table, column, size = line.split("|")
        columns.setdefault(table, {})[column] = None if size == "text" else int(size)
    return columns


def tables_of(text):
    tables = []
    for url in re.findall(r"\[#LJVIS_RESQL\]/([\w/\-]+)", text):
        sql = RESQL / (url + ".sql")
        if sql.exists():
            tables += re.findall(r"INSERT\s+INTO\s+([\w.]+)", sql.read_text(encoding="utf-8"), re.I)
    return list(dict.fromkeys(tables))


def owners(path):
    """The files that write to the database for this validation file: itself, or the routes that call it as a template."""
    text = path.read_text(encoding="utf-8")
    if tables_of(text):
        return [text]
    template = str(Path(*path.relative_to(RUUTER).with_suffix("").parts[1:]))
    callers = []
    for other in (RUUTER / "POST").rglob("*.yml"):
        body = other.read_text(encoding="utf-8")
        if f'template: "{template}"' in body:
            callers.append(body)
    return callers


def check(columns, root_files=None):
    errors, compared = [], 0
    for path in sorted(root_files or (RUUTER).rglob("*.yml")):
        text = path.read_text(encoding="utf-8")
        if "returnMaxLength" not in text:
            continue
        fields = {step: field for step, field in FIELD.findall(text)}
        tables = [t for body in owners(path) for t in tables_of(body)]
        limits = LIMIT.findall(text)
        steps = re.findall(r"^returnMaxLength\w+:", text, re.M)
        if len(limits) != len(steps):
            errors.append(f"{path.relative_to(ROOT)}: {len(steps)} returnMaxLength steps but {len(limits)} recognised limits")
        for limit, step in limits:
            field = fields.get(step)
            column = snake(field) if field else None
            sizes = [columns[t][column] for t in tables if t in columns and column in columns[t]]
            where = str(path.relative_to(ROOT))
            if not field or not sizes:
                errors.append(f"{where}: {field or step} has limit {limit} but no column {column} in {tables or 'any table'}")
                continue
            compared += 1
            for size in sizes:
                if size is not None and size != int(limit):
                    errors.append(f"{where}: {field} limit is {limit} but the column {column} is VARCHAR({size})")
    return list(dict.fromkeys(errors)), compared


def main():
    columns = load_columns(os.environ.get("PSQL_CMD", DEFAULT_PSQL))
    errors, compared = check(columns)
    for error in errors:
        print(error)
    print(f"Text length limits vs database: {compared} limits compared, " + ("FAILED" if errors or not compared else "OK"))
    return 1 if errors or not compared else 0


if __name__ == "__main__":
    sys.exit(main())
