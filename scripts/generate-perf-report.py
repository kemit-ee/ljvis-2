#!/usr/bin/env python3
"""Koostab jõudlustestide tulemuste tabeli k6 JSON-kokkuvõtetest.

Kasutus:
    python3 scripts/generate-perf-report.py [tests/performance/tulemus] > docs/testimine/joudlustestid-tulemused.md

Sisend: tests/performance/tulemus/<stsenaarium>.json (k6 handleSummary väljund).
Skript ei lisa ühtegi arvu, mida kokkuvõtetes ei ole.
"""
import json
import sys
from pathlib import Path

d = Path(sys.argv[1] if len(sys.argv) > 1 else "tests/performance/tulemus")
ORDER = ["smoke", "load", "stress", "spike", "soak"]
files = {p.stem: p for p in d.glob("*.json")}
if not files:
    sys.exit(f"Tulemusfaile ei leitud kaustast {d}")


def val(m, metric, stat):
    v = m.get(metric, {}).get("values", {}).get(stat)
    return "—" if v is None else f"{v:.0f}"


print("# Jõudlustestide tulemused\n")
print("Genereeritud skriptiga `scripts/generate-perf-report.py`. Metoodika ja sihid: [joudlustestid.md](joudlustestid.md).\n")
print("| Stsenaarium | Päringuid | Vigu % | p95 lugemine ms | p99 lugemine ms | p95 kirjutamine ms | p99 kirjutamine ms | Sihid |")
print("|---|---|---|---|---|---|---|---|")
for name in [n for n in ORDER if n in files] + [n for n in files if n not in ORDER]:
    data = json.loads(files[name].read_text())
    m = data.get("metrics", {})
    reqs = m.get("http_reqs", {}).get("values", {}).get("count")
    fail = m.get("http_req_failed", {}).get("values", {}).get("rate")
    failed_thr = [k for k, t in m.items() if isinstance(t, dict) and any(
        v is False or (isinstance(v, dict) and not v.get("ok", True))
        for v in t.get("thresholds", {}).values())]
    print(f"| {name} | {int(reqs) if reqs is not None else '—'} | "
          f"{'—' if fail is None else f'{fail*100:.2f}'} | "
          f"{val(m,'ljvis_read_duration','p(95)')} | {val(m,'ljvis_read_duration','p(99)')} | "
          f"{val(m,'ljvis_write_duration','p(95)')} | {val(m,'ljvis_write_duration','p(99)')} | "
          f"{'täidetud' if not failed_thr else 'EI TÄIDETUD: ' + ', '.join(failed_thr)} |")
