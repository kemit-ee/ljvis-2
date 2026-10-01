# Testijooksu kokkuvõte — 01.10.2026

Versioon: commit `caa78802` (rakenduse kood = PR #497). Keskkond: CI-pinu
`docker-compose.ci.yml`, iga tase puhta andmebaasiga. Selle jooksu põhjal on
koostatud [testiraport](../../testiraport.md), [testilood-ui](../../testilood-ui.md)
ja [apitestid](../../apitestid.md).

## UI-testid (Playwright) — `bash tests/playwright/run.sh`


Kuupäev: 2026-10-01T16:19:35.756Z
Kestus: 202.1 s

| Kokku | Läbis | Kukkus | Vahele jäetud | Flaky |
|---|---|---|---|---|
| 133 | 133 | 0 | 0 | 0 |

_Ebaõnnestumisi pole._

---

HTML-raport: `npx playwright show-report tests/playwright/tulemus/html-raport`

_`tulemus/` on `.gitignore`'s — CI laeb selle artefaktina `playwright-tulemus`._

## API-testid (Newman) — `bash tests/postman/run-all.sh`

Tulemus: 29/29 kollektsiooni, 1033 päringut, 2265 kontrolli — kukkus 0.
Auditiahela kontroll pärast kõiki teste: 447 sündmust, terviklik.

### Kollektsioonid

| # | Moodul | Kollektsioon | Testitüübid | Päringuid | Kontrolle | Läbis | Kukkus | Kestus |
|---|---|---|---|---|---|---|---|---|
| 1 | Asutused | `organisations` | funktsionaalne, turve | 5 | 13 | 13 | 0 | 0 s |
| 2 | Õigused | `permissions` | funktsionaalne, turve | 5 | 26 | 26 | 0 | 0 s |
| 3 | Kasutajad | `users` | funktsionaalne, turve, regressioon | 28 | 54 | 54 | 0 | 1 s |
| 4 | Kasutajagrupid | `user-groups` | funktsionaalne, turve, regressioon | 27 | 58 | 58 | 0 | 1 s |
| 5 | Klassifikaatorid | `classifiers` | funktsionaalne, turve, regressioon | 31 | 78 | 78 | 0 | 20 s |
| 6 | Koondvorm | `compound-form` | funktsionaalne, regressioon, turve | 11 | 27 | 27 | 0 | 6 s |
| 7 | Sõidu- ja puhkeaja vormid (juht, meeskonnaliige) | `driverest-forms` | funktsionaalne, regressioon, integratsioon | 33 | 60 | 60 | 0 | 12 s |
| 8 | Transpordiameti kontrollkaart (TRAM) | `tram-control-card` | funktsionaalne, regressioon | 26 | 51 | 51 | 0 | 10 s |
| 9 | Tööinspektsiooni kontrollkaart | `labour-inspection` | funktsionaalne, regressioon, integratsioon | 25 | 51 | 51 | 0 | 10 s |
| 10 | Välisriigi kontrollkaart | `foreign-violation-form` | funktsionaalne, regressioon | 30 | 59 | 59 | 0 | 17 s |
| 11 | ERRU CTUD (tegevusloa kontroll) | `erru-ctud` | funktsionaalne, integratsioon, töökindlus, turve | 61 | 148 | 148 | 0 | 23 s |
| 12 | ERRU CGR (mainepäring) | `erru-cgr` | funktsionaalne, integratsioon, töökindlus, turve | 63 | 150 | 150 | 0 | 23 s |
| 13 | ERRU RSI (tehnokontrolli teade) | `erru-rsi` | funktsionaalne, integratsioon, töökindlus, turve | 69 | 150 | 150 | 0 | 26 s |
| 14 | ERRU NCR (kontrollitulemuse teade) | `erru-ncr` | funktsionaalne, integratsioon, töökindlus, turve | 75 | 190 | 190 | 0 | 27 s |
| 15 | ERRU NU (sobimatusteade) | `erru-nu` | funktsionaalne, integratsioon, töökindlus, turve | 107 | 236 | 236 | 0 | 31 s |
| 16 | ERRU XML-adapter | `erru-xml-adapter` | integratsioon, töökindlus | 28 | 55 | 55 | 0 | 22 s |
| 17 | Sõiduki ja haagise tehnonõuete vormid | `technical-check-forms` | funktsionaalne, regressioon | 31 | 62 | 62 | 0 | 11 s |
| 18 | Autoveo katkestamine | `transport-interruption` | funktsionaalne, regressioon | 22 | 50 | 50 | 0 | 8 s |
| 19 | Ohtlike veoste (ADR) vorm | `adr-form` | funktsionaalne, regressioon | 28 | 66 | 66 | 0 | 10 s |
| 20 | Hea maine vorm | `good-repute-form` | funktsionaalne, regressioon, integratsioon | 24 | 53 | 53 | 0 | 9 s |
| 21 | Vormiotsing | `form-search` | funktsionaalne, turve | 17 | 32 | 32 | 0 | 6 s |
| 22 | X-tee pakutavad teenused (päringud) | `xroad-provide-query` | integratsioon, turve | 19 | 41 | 41 | 0 | 0 s |
| 23 | X-tee pakutavad teenused (kirjutamine) | `xroad-provide-write` | integratsioon, turve, töökindlus | 24 | 42 | 42 | 0 | 0 s |
| 24 | Riskitasemed | `risk-scores` | funktsionaalne, regressioon | 31 | 103 | 103 | 0 | 1 s |
| 25 | Kodaniku vaade ja esindusõigus | `citizen-representation` | funktsionaalne, turve | 10 | 19 | 19 | 0 | 1 s |
| 26 | Ajastatud tööd (cron) | `cron-jobs` | töökindlus, integratsioon, regressioon | 105 | 220 | 220 | 0 | 2 s |
| 27 | Teavitused ja Postkast | `notifications` | funktsionaalne, integratsioon, töökindlus | 34 | 59 | 59 | 0 | 12 s |
| 28 | Auditilogi | `audit-log` | funktsionaalne, turve | 19 | 35 | 35 | 0 | 0 s |
| 29 | Ametniku töölaud | `dashboard` | funktsionaalne, regressioon | 45 | 77 | 77 | 0 | 17 s |

## Muud testid

| Test | Tulemus |
|---|---|
| `dsl-test` DSL-tests (avalik Ruuter) | 26/26 läbis |
| `dsl-test` DSL-tests-internal (sisemine Ruuter) | 26/26 läbis |
| `scripts/test-xtee-mock.sh` | 69/69 läbis |
| `tests/contract/test_erru_contract.py` | 16/16 OK |
| `tests/contract/check_erru_contract.py` | 29 NU lepingukontrolli OK |
| ERRU/SQL kontrollid `run-all.sh`-is | 125 XSD-käitumiskontrolli OK; NU mustandi kooskõla, NU valideerimine, SP → ERRU punktid läbisid |
| Vitest (`npm test -- --run`) | 13 faili, 75/75 läbis |
| `dsl-lint --require-guard` | 602 faili, 0 viga |
