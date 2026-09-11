# LJVIS2 tehnoloogia ülevaade

Sellel lehel on ülevaade infosüsteemis kasutatavatest peamistest tehnoloogiatest ja komponentidest ning nende versioonidest. Versioonimuudatused säilitatakse versiooniajaloos.

**Tabeli viimati uuendatud:** 2026-09-11

## Hetkel kasutusel olevad tehnoloogiad ja komponendid

| Tehnoloogia / komponent | Otstarve | Versioon | Versiooni allikas | Kasutusel alates | Keskkond | Märkused |
|---|---|---|---|---|---|---|
| PostgreSQL | Põhiandmebaas | 17 | `postgres:17` | 2026-09-10 | DEV/CI | |
| PostgreSQL | TIM andmebaas | 17 | `postgres:17` | 2026-09-10 | DEV/CI | |
| Liquibase | Andmebaasi migratsioonid | 4.29.2 | `liquibase/liquibase:4.29.2` | 2026-09-01 | DEV/CI | |
| Ruuter | Avalik API ja töövood | 0.9.15-rc | `turnerrainer/ruuter:0.9.15-rc` + digest | 2026-09-10 | DEV/CI | Helm DEV release `0.1.0-main.222.g386a85d6`; avalik ja sisemine Ruuter on eraldi teenused. |
| Resql | SQL-päringute teenus | 0.3.0-alpha | `turnerrainer/resql:0.3.0-alpha` + digest | 2026-09-10 | DEV/CI | |
| DataMapper | Andmete teisendamine | 0.1.3-alpha | `turnerrainer/datamapper:0.1.3-alpha` + digest | 2026-09-07 | DEV/CI | |
| XTR | X-tee väljumispunkt | määramata | `turnerrainer/xtr:rc` (lokaal); release Dockerfile digest | 2026-09-10 | DEV/CI/PROD | Täpset runtime-versiooni ei ole tagist usaldusväärselt tuvastatud. |
| TIM | TARA identiteediteenus | 0.3.0-alpha | `turnerrainer/tim:0.3.0-alpha` + digest | 2026-09-07 | DEV/CI | |
| Nysiis | ERRU sõnumite teenus | määramata | `eclipse-temurin:21-jdk-alpine` / `eclipse-temurin:21-jre-alpine` | 2026-08-19 | DEV/CI | Rakenduse versiooni projekt ei määra. |
| TARA mock | Arenduse autentimise mock | määramata | `golang:latest`, `debian:bookworm-slim` | 2026-09-07 | DEV/CI | Ainult arendus- ja CI-keskkonnas. |
| S3 proxy | Manuste objektisalvestuse API | 22 | `node:22-alpine` | 2026-07-13 | DEV/CI | |
| CronManager | Ajastatud tööde käivitamine | 0.1.4-alpha | `turnerrainer/cronmanager:0.1.4-alpha` + digest | 2026-09-10 | DEV/CI | |
| pdf-creator | Vormide PDF-genereerimine | 1.1.0 | `pdf-creator/VERSION`; Python `python:3-alpine` + digest | 2026-09-11 | DEV/CI/PROD | Helm DEV release `0.1.0-main.222.g386a85d6`; eraldi teenus. |
| Frontend | Kasutajaliides | 1.3.0 | `frontend/package.json` | 2026-09-11 | DEV | React + TypeScript + Vite. |

## Versiooniajalugu

| Tehnoloogia / komponent | Versioon | Kasutusel alates | Kasutusel kuni | Allikas või muudatus |
|---|---|---|---|---|
| Frontend | 1.2.2 | määramata | 2026-09-11 | `frontend/package.json` |
| Frontend | 1.3.0 | 2026-09-11 |  | NCR ja Tööinspektsiooni salvestuse parendused |
| Kõik Helm workload chartid | 0.1.0-main.222.g386a85d6 | 2026-09-10 |  | DevOpsi `environments/dev/release.yaml` |

## Täiendav info

- Versioon „määramata” tähendab, et projektis ei ole usaldusväärset kasutuselevõtu kuupäeva või image'i tegelikku runtime-versiooni määratud.
- Ruuteri projektid (avalik Ruuter, `ruuter-internal`, CI mock) on loogiliselt eraldi teenused ja võivad eri paigaldustes töötada eri instantsidel.
- Digestid on Dockerfile'ides säilitatud; tabeli allikas nimetab image'i tagi ja märgib digestiga kinnitatud image'i.
- DevOpsi chartid kasutavad `kemitchart` sõltuvust versiooniga `0.24.0`.
