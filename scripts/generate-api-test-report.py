#!/usr/bin/env python3
"""
Genereerib kõigi API-testide nimekirja koos tulemustega (docs/testimine/apitestid.md).

Sisend on päris testijooksu väljund, mitte käsitsi koostatud tabel:
  - Newmani JSON-raportid  tests/postman/reports/<kollektsioon>.json
    (tekivad `bash tests/postman/run-all.sh` jooksul);
  - kollektsioonid         tests/postman/collections/<kollektsioon>.collection.json
    (kaustade nimed testirühmadeks);
  - valikuliselt dsl-testi, X-tee mocki ja contract-testide logid.

Kasutus:
  python3 scripts/generate-api-test-report.py \\
      --commit 3acdcd97 --date 2026-10-01 \\
      [--dsl-log dsltest.log] [--dsl-internal-log dsltest-int.log] \\
      [--xtee-mock-log xtee-mock.log] [--contract-log contract.log ...] \\
      [--ci-run-url https://github.com/.../actions/runs/123] \\
      [--out docs/testimine/apitestid.md]

Ainult standardteek.
"""
import argparse
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

REPO = Path(__file__).resolve().parent.parent
REPORTS = REPO / "tests" / "postman" / "reports"
COLLECTIONS = REPO / "tests" / "postman" / "collections"

# Kollektsioonid run-all.sh järjekorras: (fail, moodul, testitüübid).
# Testitüübid katavad hanke nõude: funktsionaalsus, regressioon, integratsioon,
# töökindlus ja turvaline kasutuselevõtt (õigused, autentimine, sisendi kontroll).
F, R, I, T, S = "funktsionaalne", "regressioon", "integratsioon", "töökindlus", "turve"
SUITES = [
    ("organisations", "Asutused", [F, S]),
    ("permissions", "Õigused", [F, S]),
    ("users", "Kasutajad", [F, S, R]),
    ("user-groups", "Kasutajagrupid", [F, S, R]),
    ("classifiers", "Klassifikaatorid", [F, S, R]),
    ("compound-form", "Koondvorm", [F, R, S]),
    ("driverest-forms", "Sõidu- ja puhkeaja vormid (juht, meeskonnaliige)", [F, R, I]),
    ("tram-control-card", "Transpordiameti kontrollkaart (TRAM)", [F, R]),
    ("labour-inspection", "Tööinspektsiooni kontrollkaart", [F, R, I]),
    ("foreign-violation-form", "Välisriigi kontrollkaart", [F, R]),
    ("erru-ctud", "ERRU CTUD (tegevusloa kontroll)", [F, I, T, S]),
    ("erru-cgr", "ERRU CGR (mainepäring)", [F, I, T, S]),
    ("erru-rsi", "ERRU RSI (tehnokontrolli teade)", [F, I, T, S]),
    ("erru-ncr", "ERRU NCR (kontrollitulemuse teade)", [F, I, T, S]),
    ("erru-nu", "ERRU NU (sobimatusteade)", [F, I, T, S]),
    ("erru-xml-adapter", "ERRU XML-adapter", [I, T]),
    ("technical-check-forms", "Sõiduki ja haagise tehnonõuete vormid", [F, R]),
    ("transport-interruption", "Autoveo katkestamine", [F, R]),
    ("adr-form", "Ohtlike veoste (ADR) vorm", [F, R]),
    ("good-repute-form", "Hea maine vorm", [F, R, I]),
    ("form-search", "Vormiotsing", [F, S]),
    ("xroad-provide-query", "X-tee pakutavad teenused (päringud)", [I, S]),
    ("xroad-provide-write", "X-tee pakutavad teenused (kirjutamine)", [I, S, T]),
    ("risk-scores", "Riskitasemed", [F, R]),
    ("citizen-representation", "Kodaniku vaade ja esindusõigus", [F, S]),
    ("cron-jobs", "Ajastatud tööd (cron)", [T, I, R]),
    ("notifications", "Teavitused ja Postkast", [F, I, T]),
    ("audit-log", "Auditilogi", [F, S]),
    ("dashboard", "Ametniku töölaud", [F, R]),
]

ANSI = re.compile(r"\x1b\[[0-9;]*m")


def md(text) -> str:
    """Markdown-tabeli lahtri jaoks ohutu tekst."""
    t = str(text if text is not None else "").replace("\r", " ").replace("\n", " ").strip()
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("|", "\\|")


def collection_leaves(collection_path: Path) -> list:
    """Kollektsiooni päringud täitmisjärjekorras: [(nimi, kausta tee)]."""
    leaves = []
    if not collection_path.exists():
        return leaves

    def walk(items, path):
        for it in items:
            if "item" in it:
                walk(it["item"], path + [it.get("name", "")])
            else:
                leaves.append((it.get("name", ""), " / ".join(p for p in path if p)))

    walk(json.loads(collection_path.read_text(encoding="utf-8")).get("item", []), [])
    return leaves


def request_label(execution: dict) -> str:
    req = execution.get("request") or execution.get("item", {}).get("request") or {}
    method = req.get("method", "")
    url = req.get("url", "")
    if isinstance(url, dict):
        path = "/" + "/".join(url.get("path", []) or [])
    else:
        path = urlparse(str(url)).path or str(url)
    return f"{method} {path}".strip()


def parse_newman(name: str) -> dict:
    report_path = REPORTS / f"{name}.json"
    if not report_path.exists():
        return {"missing": True}
    data = json.loads(report_path.read_text(encoding="utf-8"))
    run = data.get("run", {})
    # Newman annab päringutele jooksul uued id-d ja nimed võivad kaustade
    # vahel korduda — seome täitmised kollektsiooni järjekorra järgi.
    leaves = collection_leaves(COLLECTIONS / f"{name}.collection.json")
    pos = 0
    rows = []
    for ex in run.get("executions", []):
        item = ex.get("item", {})
        group = ""
        for k in range(pos, len(leaves)):
            if leaves[k][0] == item.get("name", ""):
                group, pos = leaves[k][1], k + 1
                break
        for a in ex.get("assertions", []) or []:
            if a.get("skipped"):
                status = "vahele jäetud"
            elif a.get("error"):
                status = "KUKKUS"
            else:
                status = "läbis"
            err = (a.get("error") or {}).get("message", "")
            rows.append({
                "group": group,
                "request": item.get("name", ""),
                "endpoint": request_label(ex),
                "test": a.get("assertion", ""),
                "status": status,
                "error": err,
            })
    timings = run.get("timings", {})
    duration_s = (timings.get("completed", 0) - timings.get("started", 0)) / 1000 if timings else 0
    stats = run.get("stats", {})
    return {
        "missing": False,
        "rows": rows,
        "requests": stats.get("requests", {}).get("total", 0),
        "requests_failed": stats.get("requests", {}).get("failed", 0),
        "duration_s": duration_s,
    }


def parse_line_log(path: str, pattern: re.Pattern) -> list:
    """Logist (dsl-test / X-tee mock) read kujul pass|fail + testi nimi."""
    if not path or not Path(path).exists():
        return []
    rows = []
    for line in Path(path).read_text(encoding="utf-8", errors="replace").splitlines():
        m = pattern.search(ANSI.sub("", line))
        if m:
            rows.append((m.group("status").lower(), m.group("name").strip()))
    return rows


DSL_LINE = re.compile(r"^\s*(?P<status>pass|fail|PASS|FAIL)\s+(?P<name>\S.*::.+)$")


def status_word(s: str) -> str:
    return "läbis" if s in ("pass", "ok", "passed") else "KUKKUS"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default=str(REPO / "docs" / "testimine" / "apitestid.md"))
    ap.add_argument("--commit", required=True)
    ap.add_argument("--date", required=True)
    ap.add_argument("--ci-run-url", default="")
    ap.add_argument("--dsl-log", default="")
    ap.add_argument("--dsl-internal-log", default="")
    ap.add_argument("--xtee-mock-log", default="")
    ap.add_argument("--contract-log", action="append", default=[])
    args = ap.parse_args()

    suites = [(n, label, types, parse_newman(n)) for n, label, types in SUITES]
    total = {"läbis": 0, "KUKKUS": 0, "vahele jäetud": 0}
    req_total = 0
    for _, _, _, res in suites:
        if res["missing"]:
            continue
        req_total += res["requests"]
        for r in res["rows"]:
            total[r["status"]] += 1
    assertions = sum(total.values())

    dsl = parse_line_log(args.dsl_log, DSL_LINE)
    dsl_int = parse_line_log(args.dsl_internal_log, DSL_LINE)
    xtee = parse_line_log(args.xtee_mock_log, DSL_LINE)

    out = []
    w = out.append
    w("# API-testide nimekiri ja tulemused")
    w("")
    w("> **Genereeritud fail — ära muuda käsitsi.** Allikas: päris testijooksu väljund, "
      "skript `scripts/generate-api-test-report.py`. Uuendamiseks käivita "
      "`bash tests/postman/run-all.sh` ja seejärel skript (vt [testiplaan](testiplaan.md) §7).")
    w("")
    w("| | |")
    w("|---|---|")
    w(f"| Viimase testimise kuupäev | {md(args.date)} |")
    w(f"| Testitud versioon (commit) | `{md(args.commit)}` |")
    w("| Keskkond | CI-pinu `docker-compose.ci.yml` (puhas andmebaas, testseemned `tests/bootstrap/`) |")
    if args.ci_run_url:
        w(f"| CI jooks | {args.ci_run_url} |")
    w(f"| Newmani kollektsioone | {sum(1 for s in suites if not s[3]['missing'])} / {len(suites)} |")
    w(f"| Päringuid | {req_total} |")
    w(f"| Kontrolle (assertion'eid) | {assertions} — läbis **{total['läbis']}**, kukkus **{total['KUKKUS']}**, "
      f"vahele jäetud {total['vahele jäetud']} |")
    if dsl or dsl_int:
        d_all = dsl + dsl_int
        w(f"| Ruuteri DSL-stsenaariume | {len(d_all)} — läbis {sum(1 for s, _ in d_all if s == 'pass')} |")
    if xtee:
        w(f"| X-tee arendaja-mocki teste | {len(xtee)} — läbis {sum(1 for s, _ in xtee if s == 'pass')} |")
    w("")
    w("Testitüübid: **funktsionaalne** (äriloogika ja andmete püsivus), **regressioon** "
      "(varem parandatud vigade kordumise vältimine), **integratsioon** (X-tee, ERRU, Postkast, "
      "teised infosüsteemid), **töökindlus** (samaaegsus, versioonikonfliktid, transpordivead, "
      "korduskatsed, ajastatud tööd), **turve** (autentimine, õigused ja asutusepõhine ulatus, "
      "sisendi valideerimine).")
    w("")

    w("## 1. Kokkuvõte kollektsioonide kaupa")
    w("")
    w("| # | Moodul | Kollektsioon | Testitüübid | Päringuid | Kontrolle | Läbis | Kukkus | Kestus |")
    w("|---|---|---|---|---|---|---|---|---|")
    for i, (name, label, types, res) in enumerate(suites, 1):
        if res["missing"]:
            w(f"| {i} | {md(label)} | `{name}` | {', '.join(types)} | — | — | — | — | jooksmata |")
            continue
        passed = sum(1 for r in res["rows"] if r["status"] == "läbis")
        failed = sum(1 for r in res["rows"] if r["status"] == "KUKKUS")
        w(f"| {i} | {md(label)} | [`{name}`](#{i}-{name}) | {', '.join(types)} | {res['requests']} | "
          f"{len(res['rows'])} | {passed} | {'**' + str(failed) + '**' if failed else 0} | {res['duration_s']:.0f} s |")
    w("")

    failed_rows = [(label, r) for _, label, _, res in suites if not res["missing"] for r in res["rows"] if r["status"] == "KUKKUS"]
    w("## 2. Kukkunud kontrollid")
    w("")
    if not failed_rows:
        w("Kukkunud kontrolle ei olnud.")
    else:
        w("| Moodul | Päring | Kontroll | Veateade |")
        w("|---|---|---|---|")
        for label, r in failed_rows:
            w(f"| {md(label)} | {md(r['request'])} | {md(r['test'])} | {md(r['error'])[:300]} |")
    w("")

    w("## 3. Kõik kontrollid kollektsioonide kaupa")
    w("")
    for i, (name, label, types, res) in enumerate(suites, 1):
        w(f"### {i}. {name}")
        w("")
        w(f"**{md(label)}** · testitüübid: {', '.join(types)} · kollektsioon "
          f"`tests/postman/collections/{name}.collection.json`")
        w("")
        if res["missing"]:
            w("_Selle kollektsiooni raportit selles jooksus ei olnud._")
            w("")
            continue
        w("| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |")
        w("|---|---|---|---|---|---|")
        for j, r in enumerate(res["rows"], 1):
            status = r["status"] if r["status"] != "KUKKUS" else "**KUKKUS**"
            w(f"| {j} | {md(r['group'])} | {md(r['request'])} | `{md(r['endpoint'])}` | {md(r['test'])} | {status} |")
        w("")

    if dsl or dsl_int:
        w(f"## 4. Ruuteri DSL-stsenaariumid (`dsl-test`)")
        w("")
        w("Ruuteri töövoogude loogika testid ilma andmebaasita (`DSL-tests/`, `DSL-tests-internal/`); "
          "väliste teenuste vastused on mockitud. Testitüübid: funktsionaalne, töökindlus, turve.")
        w("")
        w("| # | Fail | Stsenaarium | Tulemus |")
        w("|---|---|---|---|")
        for j, (s, name) in enumerate(dsl + dsl_int, 1):
            file, _, scen = name.partition("::")
            w(f"| {j} | `{md(file)}` | {md(scen)} | {status_word(s)} |")
        w("")
    if xtee:
        w("## 5. X-tee arendaja-mocki testid")
        w("")
        w("`DSL-mock-tests/xtee.test.yml` — avaliku arendaja-mocki leping ja käitumine "
          "(vt [X-tee testprotokoll](../xtee/08-testprotokoll.md)).")
        w("")
        w("| # | Stsenaarium | Tulemus |")
        w("|---|---|---|")
        for j, (s, name) in enumerate(xtee, 1):
            w(f"| {j} | {md(name.partition('::')[2] or name)} | {status_word(s)} |")
        w("")
    if args.contract_log:
        w("## 6. Lepingu- ja andmebaasitestid")
        w("")
        w("| Test | Tulemus (logi viimane rida) |")
        w("|---|---|")
        for path in args.contract_log:
            p = Path(path)
            lines = [ANSI.sub("", l).strip() for l in p.read_text(encoding="utf-8", errors="replace").splitlines() if l.strip()] if p.exists() else []
            w(f"| `{md(p.stem)}` | {md(lines[-1] if lines else 'logi puudub')} |")
        w("")

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text("\n".join(out) + "\n", encoding="utf-8")
    print(f"{args.out}: {len(suites)} kollektsiooni, {assertions} kontrolli "
          f"(läbis {total['läbis']}, kukkus {total['KUKKUS']})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
