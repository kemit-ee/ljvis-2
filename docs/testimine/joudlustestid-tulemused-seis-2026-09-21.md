# Jõudlustestide tulemused: seis 21.09.2026

| Väli | Väärtus |
|---|---|
| Koodi seis | `dev` seis 21.09.2026 (viimane commit sel päeval) |
| Commit | `fe63c5666` |
| **Jooksu kuupäev** | **08.10.2026** |
| Keskkond | CI-pinu (`docker-compose.ci.yml`, Ruuterid 0,5 CPU, üks PostgreSQL), Docker Desktop 10 CPU / 8 GB, macOS |
| Seemendus | `SEED_FORMS=50`, puhas andmebaas |
| k6 | `grafana/k6:latest` Dockeris (k6 v2.2.0 (commit/00a9a1b7f5, go1.26.5, linux/arm64)) |
| Skriptid | `tests/performance/` seisuga 02.10.2026 (commit `58274fdd`); k6 skriptid on 02.10 versioonist, sest 21.09 commitis neid veel ei olnud; rakenduskood on 21.09 oma |
| Jooksud | üks jooks stsenaariumi kohta; `soak` jooksutamata |

Genereeritud skriptiga `scripts/generate-perf-report.py`. Metoodika ja sihid: [joudlustestid.md](joudlustestid.md).

| Stsenaarium | Päringuid | Vigu % | p95 lugemine ms | p99 lugemine ms | p95 kirjutamine ms | p99 kirjutamine ms | Sihid |
|---|---|---|---|---|---|---|---|
| smoke | 67 | 0.00 | 254 | 273 | 0 | 0 | täidetud |
| load | 13145 | 0.00 | 2161 | 2768 | 2978 | 3505 | EI TÄIDETUD: ljvis_read_duration, ljvis_write_duration |
| stress | 9687 | 4.45 | 44621 | 60000 | 59998 | 60005 | EI TÄIDETUD: ljvis_read_duration, ljvis_write_duration, http_req_failed, checks |
| spike | 2713 | 0.00 | 38267 | 45658 | 0 | 0 | EI TÄIDETUD: ljvis_read_duration |

Siht: lugemine p95 < 800 ms, p99 < 2000 ms; kirjutamine p95 < 1500 ms, p99 < 3000 ms; vigu < 1 %; kontrolle > 99 %. Metoodika: [joudlustestid.md](joudlustestid.md).

**Piirangud.** Üks jooks stsenaariumi kohta, seega mõõtemüra ei ole hinnatud. CI-pinu on tootmisest väiksem, tulemus ei kehti otse tootmisele. Lõpp-punktide kaupa jaotust ja ressursikasutust (`docker stats`) ei mõõdetud.

**Korratavus.** Sama 21.09 koodiga load kordusjooks andis hoopis ~28 s p95 (3724 päringut vs 13 145 esimesel jooksul), seega **jooksudevaheline hajuvus on suurem kui 21.09 ja praeguse seisu vahe**; seisude vahel regressiooni ei saa nende andmete põhjal väita. Tulemused sõltuvad tugevalt masinast (Docker Desktop, jagatud host); sihtide tõendamiseks on vaja korduvaid jooksu eraldatud testkeskkonnas.
