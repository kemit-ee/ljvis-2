#!/usr/bin/env python3
"""Genereerib andmebaasi skeemi dokumendid Liquibase changelog'ist.

Väljund:
  docs/architecture/andmemudel-skeem.md  - kõik tabelid ja veerud skeemide kaupa
  docs/architecture/andmemudel-erd.md    - käsitsi hoitav ülevaade (seda skript EI kirjuta),
                                           kontrollitakse ainult, et ülevaates mainitud tabelid on olemas.

Kasutus:
    python3 scripts/generate-erd.py           # kirjutab skeemidokumendi
    python3 scripts/generate-erd.py --check   # CI: viga, kui dokument on aegunud või ERD viitab olematule tabelile

Allikas on ainult `CREATE TABLE`/`ALTER TABLE ... ADD/DROP COLUMN` failides
DSL/Liquibase/changelog/*.sql (rollback-failid jäetakse välja). Tabelid, mis luuakse
DO-plokkides või dünaamilise SQL-iga, siia ei jõua.
"""
import re
import sys
from collections import OrderedDict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CHANGELOG = REPO / "DSL" / "Liquibase" / "changelog"
OUT = REPO / "docs" / "architecture" / "andmemudel-skeem.md"
ERD = REPO / "docs" / "architecture" / "andmemudel-erd.md"

TABLE_RE = re.compile(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w.]+)\s*\(", re.I)
ALTER_RE = re.compile(r"ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?([\w.]+)\s+(.*?);", re.I | re.S)
CONSTRAINT_START = ("constraint", "primary key", "foreign key", "unique", "check", "exclude")


def strip_comments(sql):
    sql = re.sub(r"/\*.*?\*/", "", sql, flags=re.S)
    return re.sub(r"--[^\n]*", "", sql)


def split_top(s, sep=","):
    parts, depth, cur, q = [], 0, [], False
    for ch in s:
        if ch == "'":
            q = not q
        if not q:
            if ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
            elif ch == sep and depth == 0:
                parts.append("".join(cur).strip())
                cur = []
                continue
        cur.append(ch)
    if "".join(cur).strip():
        parts.append("".join(cur).strip())
    return parts


def balanced_body(sql, start):
    depth, i = 1, start
    while i < len(sql) and depth:
        depth += {"(": 1, ")": -1}.get(sql[i], 0)
        i += 1
    return sql[start:i - 1], i


def parse_column(defn):
    m = re.match(r'"?(\w+)"?\s+(.*)$', defn, re.S)
    if not m:
        return None
    name, rest = m.group(1), m.group(2)
    tm = re.match(r"(.*?)(?:\s+(?:NOT\s+NULL|NULL|DEFAULT|PRIMARY|REFERENCES|UNIQUE|CHECK|CONSTRAINT|GENERATED)\b|$)", rest, re.S | re.I)
    typ = re.sub(r"\s+", " ", tm.group(1)).strip()
    return {
        "name": name, "type": typ,
        "notnull": bool(re.search(r"\bNOT\s+NULL\b", rest, re.I)) or bool(re.search(r"\bPRIMARY\s+KEY\b", rest, re.I)),
        "pk": bool(re.search(r"\bPRIMARY\s+KEY\b", rest, re.I)),
        "ref": (re.search(r"\bREFERENCES\s+([\w.]+)", rest, re.I) or [None, None])[1],
    }


def build():
    tables = OrderedDict()
    for f in sorted(CHANGELOG.glob("*.sql")):
        if "rollback" in f.name:
            continue
        sql = strip_comments(f.read_text(encoding="utf-8"))
        for m in TABLE_RE.finditer(sql):
            name = m.group(1).lower()
            if "." not in name:
                continue
            body, _ = balanced_body(sql, m.end())
            cols, pks, fks = OrderedDict(), [], []
            for part in split_top(body):
                if part.lower().startswith(CONSTRAINT_START):
                    pk = re.search(r"PRIMARY\s+KEY\s*\(([^)]*)\)", part, re.I)
                    if pk:
                        pks += [c.strip().strip('"') for c in pk.group(1).split(",")]
                    fk = re.search(r"FOREIGN\s+KEY\s*\(([^)]*)\)\s*REFERENCES\s+([\w.]+)", part, re.I)
                    if fk:
                        fks.append((fk.group(1).strip(), fk.group(2).lower()))
                    continue
                c = parse_column(part)
                if c:
                    if c["pk"]:
                        pks.append(c["name"])
                    if c["ref"]:
                        fks.append((c["name"], c["ref"].lower()))
                    cols[c["name"]] = c
            tables[name] = {"cols": cols, "pk": pks, "fk": fks, "file": f.name}
        for m in ALTER_RE.finditer(sql):
            name = m.group(1).lower()
            if name not in tables:
                continue
            for part in split_top(m.group(2)):
                a = re.match(r"ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?(.*)$", part, re.I | re.S)
                if a:
                    c = parse_column(a.group(1))
                    if c:
                        tables[name]["cols"][c["name"]] = c
                        if c["ref"]:
                            tables[name]["fk"].append((c["name"], c["ref"].lower()))
                d = re.match(r"DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+)?\"?(\w+)", part, re.I)
                if d:
                    tables[name]["cols"].pop(d.group(1), None)
    return tables


def render(tables):
    by_schema = OrderedDict()
    for t in sorted(tables):
        by_schema.setdefault(t.split(".")[0], []).append(t)
    out = ["# Andmebaasi skeem (genereeritud)", "",
           "> **Genereeritud fail.** Ära muuda käsitsi: `python3 scripts/generate-erd.py`. Allikas: "
           "`DSL/Liquibase/changelog/*.sql` (`CREATE TABLE` + `ALTER TABLE … ADD/DROP COLUMN`). "
           "PK ja võõrvõtmed on tabeli loomise hetkeseisuga; hilisemad `ALTER … ADD/DROP CONSTRAINT` siin ei kajastu. "
           "Seosed ülevaates: [andmemudel-erd.md](andmemudel-erd.md).", "",
           f"Skeemid: {len(by_schema)}, tabeleid: {len(tables)}.", ""]
    for schema, names in by_schema.items():
        out += [f"## Skeem `{schema}`", ""]
        for t in names:
            d = tables[t]
            out += [f"### `{t}`", "", f"Loodud: `{d['file']}` · veerge: {len(d['cols'])}"
                    + (f" · PK: `{', '.join(d['pk'])}`" if d["pk"] else ""), ""]
            if d["fk"]:
                out += ["Võõrvõtmed: " + ", ".join(f"`{c}` → `{r}`" for c, r in d["fk"]), ""]
            out += ["| Veerg | Tüüp | Kohustuslik |", "|---|---|---|"]
            for c in d["cols"].values():
                out.append(f"| `{c['name']}` | {c['type']} | {'jah' if c['notnull'] else ''} |")
            out.append("")
    return "\n".join(out)


def main():
    tables = build()
    text = render(tables)
    problems = []
    if ERD.exists():
        for t in sorted(set(re.findall(r"`((?:forms|users|classifier|audit|notifications|erru|risk|xroad)\.[a-z_]+)`", ERD.read_text(encoding="utf-8")))):
            if t not in tables:
                problems.append(f"ERD viitab olematule tabelile: {t}")
    if "--check" in sys.argv:
        if not OUT.exists() or OUT.read_text(encoding="utf-8") != text:
            problems.append(f"{OUT.relative_to(REPO)} on aegunud - käivita: python3 scripts/generate-erd.py")
        if problems:
            print("\n".join(problems))
            sys.exit(1)
        print(f"OK: {len(tables)} tabelit")
        return
    OUT.write_text(text, encoding="utf-8")
    print(f"Kirjutatud {OUT.relative_to(REPO)}: {len(tables)} tabelit")
    for p in problems:
        print("HOIATUS:", p)


if __name__ == "__main__":
    main()
