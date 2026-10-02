# LJVIS 1 → LJVIS 2 andmemigratsioon: dokumentatsiooni sisukord

Hange (HD4 Lisa 6 p.10) nõuab migratsioonidokumentatsioonis vähemalt: migratsioonistrateegiat
(cutover/rollback), andmekaardistust ja transformatsioonireegleid, migratsiooniskripte/ETL-i
koos käivitusjuhistega ning andmekvaliteedi kriteeriume, kontrolli ja raporteid.
Migratsioon loetakse lõpetatuks pärast kõikide kvaliteedinõuete täitmist ja raporti esitamist.

| Hanke nõue | Dokument | Seis |
|---|---|---|
| Migratsioonistrateegia (cutover/rollback) | [01-migratsioonistrateegia.md](01-migratsioonistrateegia.md) | Valmis; avatud otsused loetletud peatükis 9 |
| Andmekaardistus ja transformatsioonireeglid | [02-andmekaardistus.md](02-andmekaardistus.md) | Valmis tasemel „vormitüüp → sihttabel"; väljade täpne vastendus on SQL-is ja CSV-des |
| Migratsiooniskriptid/ETL + käivitusjuhised | [`DSL/migration/`](../../DSL/migration/README.md) (ETL), [run/](run/README.md), [s3/](s3/README.md), [files/](files/README.md), [live/](live/README.md), [client-review/](client-review/README.md) | Skriptid olemas; tootmisjooks blokeeritud avatud vastenduste tõttu |
| Andmekvaliteedi kriteeriumid, kontroll | [03-andmekvaliteet.md](03-andmekvaliteet.md) | Valmis |
| Raportid | [04-migratsioonitesti-raport.md](04-migratsioonitesti-raport.md), [05-lopliku-migratsiooni-raport.md](05-lopliku-migratsiooni-raport.md) | Testiraport: proovijooksu faktid, tulemuste lahtrid täidetakse; lõppraport: mall |
| Lähteandmete päringud DBA-le | [migration-guidelines.md](migration-guidelines.md) | Etapp 1–4 päringud |
| Rikkumiste vastendused | [violation-mapping-status.md](violation-mapping-status.md), [vana klassifikaatorid](old-classifiers.md) | Avatud 42 võtit |

> **Avatud punkt: ajapiir.** Hanke tekst nõuab andmeid, mis ei ole vanemad kui **viis aastat**.
> Migratsioonikood ja omaniku 22.09.2026 kinnitus kasutavad **kolme aastat**.
> Vt [strateegia peatükk 9](01-migratsioonistrateegia.md#9-avatud-otsused).

> **Märkus (harude seis):** ETL-i skriptid ja siinsed töödokumendid on toodud `origin/feature/migration` harust.
> Ajalooliste klassifikaatorite Liquibase changesetid (`20261125100000-old-classifiers`,
> `20261125120000-old-classifier-description-evidence`) on seni ainult selles harus ja tuleb `dev`-i tuua selle haru
> enda PR-iga. Samuti on `migration-guidelines.md` `dev`-is varasem (22.09.2026) versioon; harus on uuem (02.10.2026)
> ülevaade administraatori sammudest ja see tuleb harude liitmisel kokku viia.
