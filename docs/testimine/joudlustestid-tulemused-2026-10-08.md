# Jõudlustestide tulemused: praegune seis

| Väli | Väärtus |
|---|---|
| Koodi seis | `dev` 08.10.2026 |
| Commit | `9a06887a` |
| **Jooksu kuupäev** | **08.10.2026** |
| Keskkond | CI-pinu (`docker-compose.ci.yml`, Ruuterid 0,5 CPU, üks PostgreSQL), Docker Desktop 10 CPU / 8 GB, macOS |
| Seemendus | `SEED_FORMS=50`, puhas andmebaas |
| k6 | `grafana/k6:latest` Dockeris (k6 v2.2.0 (commit/00a9a1b7f5, go1.26.5, linux/arm64)) |
| Skriptid | `tests/performance/` seisuga 02.10.2026 (commit `58274fdd`); rakenduskood = `9a06887a` |
| Jooksud | üks jooks stsenaariumi kohta; `soak` jooksutamata |

Genereeritud skriptiga `scripts/generate-perf-report.py`. Metoodika ja sihid: [joudlustestid.md](joudlustestid.md).

| Stsenaarium | Päringuid | Vigu % | p95 lugemine ms | p99 lugemine ms | p95 kirjutamine ms | p99 kirjutamine ms | Sihid |
|---|---|---|---|---|---|---|---|
| smoke | 67 | 0.00 | 886 | 887 | 0 | 0 | EI TÄIDETUD: ljvis_read_duration |
| load | 5977 | 0.00 | 9637 | 12057 | 11595 | 13042 | EI TÄIDETUD: ljvis_read_duration, ljvis_write_duration |
| stress | 7818 | 13.10 | 37033 | 39241 | 39182 | 40988 | EI TÄIDETUD: http_req_failed, ljvis_write_duration, ljvis_read_duration, checks |
| spike | 3174 | 6.71 | 34900 | 38989 | 0 | 0 | EI TÄIDETUD: checks, ljvis_read_duration, http_req_failed |

Siht: lugemine p95 < 800 ms, p99 < 2000 ms; kirjutamine p95 < 1500 ms, p99 < 3000 ms; vigu < 1 %; kontrolle > 99 %. Metoodika: [joudlustestid.md](joudlustestid.md).

**Piirangud.** Üks jooks stsenaariumi kohta, seega mõõtemüra ei ole hinnatud. CI-pinu on tootmisest väiksem, tulemus ei kehti otse tootmisele. Lõpp-punktide kaupa jaotust ja ressursikasutust (`docker stats`) ei mõõdetud.

**Korratavus.** Sama koodiga load kordusjooksud andsid p95 lugemise vahemikus 9,6 s (esimene jooks) kuni ~6,6 s (Ruuter 2 CPU). Tulemused sõltuvad tugevalt masinast (Docker Desktop, jagatud host); sihtide tõendamiseks on vaja korduvaid jooksu eraldatud testkeskkonnas.
