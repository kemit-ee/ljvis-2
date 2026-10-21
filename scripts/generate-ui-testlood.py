#!/usr/bin/env python3
"""
Genereerib UI-testilood (docs/testimine/testilood-ui.md) Playwrighti päris
testijooksu JSON-tulemusest (tests/playwright/tulemus/playwright-tulemus.json).

Iga testilugu = üks Playwrighti test: ID, moodul, seotud nõuded, roll,
sammud (test.step pealkirjad — sama tekst, mis tulemus-reporteri
kirjeldus.md-s), viimase jooksu tulemus ja kestus.

Kasutus:
  python3 scripts/generate-ui-testlood.py --commit 3acdcd97 \\
      [--results tests/playwright/tulemus/playwright-tulemus.json] \\
      [--out docs/testimine/testilood-ui.md]

Ainult standardteek.
"""
import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DEFAULT_RESULTS = REPO / "tests" / "playwright" / "tulemus" / "playwright-tulemus.json"

# spec → (ID prefiks, moodul, seotud nõuded / allikad). Nõuete ID-d on
# docs/testimine/testiraport.md §5 jälgitavusmaatriksis.
SPECS = {
    "smoke.spec.ts": ("SMK", "Sisselogimine, töölaud ja vormide avamine", "N-AUTH-01, N-AUTH-02, N-UI-01"),
    "users.spec.ts": ("KAS", "Kasutajate haldus", "PA-01…PA-09, KH-01…KH-08"),
    "user-groups.spec.ts": ("GRP", "Kasutajagruppide haldus", "PA-10…PA-19, KH-09…KH-12"),
    "classifiers.spec.ts": ("KLF", "Klassifikaatorite haldus", "PK-01…PK-08"),
    "risk-scores.spec.ts": ("RSK", "Riskitasemed", "N-RISK-01, N-RISK-02"),
    "notifications.spec.ts": ("TEA", "Teavitused ja saadetud kirjad", "N-TEA-01…N-TEA-04"),
    "notification-template-mapping.spec.ts": ("PKM", "Postkasti mallide ja vastuvõtjate seaded", "N-TEA-05"),
    "audit-logs.spec.ts": ("AUD", "Auditilogi", "N-AUD-01…N-AUD-04"),
    "form-search.spec.ts": ("OTS", "Vormiotsing", "N-OTS-01…N-OTS-04 (LJVIS2-9)"),
    "xroad-etoimik-logs.spec.ts": ("XTL", "X-tee logid (haldus)", "N-XTEE-10, N-XTEE-11"),
    "xtee-teenused.spec.ts": ("XTP", "X-tee pakutavad teenused", "N-XTEE-01…N-XTEE-09"),
    "compound-form.spec.ts": ("KON", "Koondvorm", "N-KON-01…N-KON-05 (#280)"),
    "compound-subforms.spec.ts": ("ALV", "Koondvormi alamvormid ja failid", "N-KON-06, N-SP-01, N-FAIL-01"),
    "tram-form.spec.ts": ("TRM", "Transpordiameti kontrollkaart (TRAM)", "N-TRAM-01…N-TRAM-06 (ADR-002, #280)"),
    "foreign-violation.spec.ts": ("VRK", "Välisriigi kontrollkaart", "N-VR-01, N-VR-02"),
    "labour-inspection.spec.ts": ("TÖÖ", "Tööinspektsiooni kontrollkaart", "N-TI-01, N-TI-02"),
    "good-repute.spec.ts": ("HEA", "Hea maine vorm", "N-HM-01, N-HM-02"),
    "adr-form.spec.ts": ("ADR", "Ohtlike veoste (ADR) alamvorm", "N-ADR-01, N-PRINT-01 (PR #310, #311)"),
    "print-buttons.spec.ts": ("PRT", "Vormide printimine", "N-PRINT-01"),
    "erru.spec.ts": ("ERU", "ERRU vormid (CTUD, CGR, RSI, NCR)", "N-ERRU-01…N-ERRU-04"),
    "rsi.spec.ts": ("RSI", "ERRU RSI teade", "N-ERRU-03 (LJVIS2-148)"),
    "nu.spec.ts": ("NU", "ERRU NU sobimatusteade", "N-ERRU-05"),
}

# Roll tuletatakse testi pealkirjast/describe'ist (spec'id kasutavad
# storageState'i: superadmin vaikimisi, officer/orgadmin/noperm eraldi).
ROLE_HINTS = [
    (re.compile(r"lokaalne kontohaldur|Org Admin|kohalik admin", re.I), "lokaalne kontohaldur (Org Admin, JUM)"),
    (re.compile(r"ametnik|õigusteta|ilma .*õiguseta|lugemisõiguseta|ainult .*õigusega", re.I), "piiratud õigustega kasutaja"),
]

STATUS = {"expected": "läbis", "unexpected": "KUKKUS", "flaky": "läbis (korduskatsel)", "skipped": "vahele jäetud"}


def md(text) -> str:
    t = str(text or "").replace("\n", " ").strip()
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("|", "\\|")


def collect(suite, path, out):
    for spec in suite.get("specs", []):
        out.append((path, spec))
    for child in suite.get("suites", []):
        collect(child, path + [child.get("title", "")], out)


def steps_of(result) -> list:
    """test.step pealkirjad (ilma sisemiste expect/klõpsu sammudeta)."""
    return [s.get("title", "") for s in result.get("steps", []) if s.get("title")]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--results", default=str(DEFAULT_RESULTS))
    ap.add_argument("--out", default=str(REPO / "docs" / "testimine" / "testilood-ui.md"))
    ap.add_argument("--commit", required=True)
    args = ap.parse_args()

    data = json.loads(Path(args.results).read_text(encoding="utf-8"))
    stats = data.get("stats", {})
    started = stats.get("startTime", "")
    try:
        run_date = datetime.fromisoformat(started.replace("Z", "+00:00")).astimezone(timezone.utc)
        run_date_s = run_date.strftime("%d.%m.%Y")
    except ValueError:
        run_date_s = started

    by_file: dict[str, list] = {}
    for top in data.get("suites", []):
        file = Path(top.get("title") or top.get("file", "")).name
        if file not in SPECS:
            continue  # global-setup jm
        items = []
        collect(top, [], items)
        by_file[file] = items

    out = []
    w = out.append
    w("# UI-testilood (Playwright)")
    w("")
    w("> **Genereeritud fail — ära muuda käsitsi.** Allikas: Playwrighti testijooksu tulemus "
      "`tests/playwright/tulemus/playwright-tulemus.json`, skript `scripts/generate-ui-testlood.py`. "
      "Testilugude ülesehitus ja meetod: [testilood.md](testilood.md).")
    w("")
    w("| | |")
    w("|---|---|")
    w(f"| Viimase testimise kuupäev | {run_date_s} |")
    w(f"| Testitud versioon (commit) | `{md(args.commit)}` |")
    w("| Keskkond | CI-pinu `docker-compose.ci.yml`, frontend staatilise buildina (`vite preview`), Chromium |")
    # Loendame ainult SPECS-is olevaid teste (JSON-i stats sisaldab ka
    # global-setup'i autentimissamme).
    counts = {"expected": 0, "unexpected": 0, "flaky": 0, "skipped": 0}
    for items in by_file.values():
        for _, spec in items:
            for t in spec.get("tests", []):
                counts[t.get("status", "skipped")] = counts.get(t.get("status", "skipped"), 0) + 1
    total = sum(counts.values())
    w(f"| Teste | {total} — läbis {counts['expected']}, kukkus {counts['unexpected']}, "
      f"korduskatsel läbis {counts['flaky']}, vahele jäetud {counts['skipped']} |")
    w("")
    w("Iga testilugu on Playwrighti automaattest, mis kirjutati voo käsitsi läbikäimise käigus ja "
      "kordab sama voogu brauseris. Sammud on testi `test.step` pealkirjad — sama tekst on iga "
      "jooksu raportis (`tulemus/<test>/kirjeldus.md`, HTML-raport). Kui test samme ei nimeta, on "
      "kontrollid testi koodis (viide „Spec“).")
    w("")
    w("## Sisukord")
    w("")
    w("| Prefiks | Moodul | Spec | Teste | Seotud nõuded |")
    w("|---|---|---|---|---|")
    for file, (prefix, module, reqs) in SPECS.items():
        n = sum(len(spec.get("tests", [])) for _, spec in by_file.get(file, []))
        anchor = re.sub(r"[^a-z0-9õäöüšž -]", "", f"tl-{prefix}-{module}".lower()).replace(" ", "-")
        w(f"| TL-{prefix} | [{md(module)}](#{anchor}) | `{file}` | {n} | {md(reqs)} |")
    w("")

    for file, (prefix, module, reqs) in SPECS.items():
        w(f"## TL-{prefix} {module}")
        w("")
        w(f"Spec: `tests/playwright/tests/{file}` · seotud nõuded: {md(reqs)}")
        w("")
        items = by_file.get(file, [])
        if not items:
            w("_Selles jooksus seda speci ei olnud._")
            w("")
            continue
        n = 0
        for path, spec in items:
            for t in spec.get("tests", []):
                n += 1
                results = t.get("results", [])
                last = results[-1] if results else {}
                status = STATUS.get(t.get("status", ""), t.get("status", ""))
                title = spec.get("title", "")
                describe = " › ".join(p for p in path if p)
                role = "peakasutaja (Super Admin)"
                for rx, label in ROLE_HINTS:
                    if rx.search(title) or rx.search(describe):
                        role = label
                        break
                if file == "xtee-teenused.spec.ts":
                    role = "X-tee klient (turvaserver, X-Road-Client päis)"
                w(f"### TL-{prefix}-{n:02d} {md(title)}")
                w("")
                w("| | |")
                w("|---|---|")
                if describe:
                    w(f"| Rühm | {md(describe)} |")
                w(f"| Roll | {role} |")
                w(f"| Spec | `{file}:{spec.get('line', '')}` |")
                w(f"| Tulemus | **{status}** ({last.get('duration', 0) / 1000:.1f} s) |")
                w("")
                steps = steps_of(last)
                if steps:
                    w("Sammud ja oodatav tulemus:")
                    w("")
                    for i, s in enumerate(steps, 1):
                        w(f"{i}. {s}")
                    w("")
                err = (last.get("error") or {}).get("message", "")
                if err:
                    w(f"Viga: `{md(err.splitlines()[0])[:300]}`")
                    w("")
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text("\n".join(out) + "\n", encoding="utf-8")
    print(f"{args.out}: {total} testi")
    return 0


if __name__ == "__main__":
    sys.exit(main())
