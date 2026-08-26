# Andmehaldus — Liquibase referentsandmed

LJVIS2 süsteemi toimimiseks vajalikud lähteandmed (klassifikaatorid, õigused ja asutused) laaditakse andmebaasi automaatselt Liquibase'i migratsioonidega asukohas:

`DSL/Liquibase/changelog/`

## Millised andmed laaditakse Liquibase'i kaudu baasi?

| Andmetüüp | Kirjeldus | Dokument |
|---|---|---|
| **Klassifikaatorid** | Rippmenüüde valikud (riikide loend, ERRU staatused, vormitüübid, rikkumiskoodid jm) | [klassifikaatorid.md](klassifikaatorid.md) |
| **Õigused** | Kasutajagruppidele määratavad süsteemiõigused (õiguste koodid ja kirjeldused) | [oigused.md](oigused.md) |
| **Asutused** | Organisatsioonid, millele kasutajaid saab luua | [organisatsioonid.md](organisatsioonid.md) |

## Kuidas see töötab?

1. Liquibase käivitatakse konteinerite käivitamisel automaatselt (`docker compose up`)
2. Migratsioonid on **idempotentsed** — sama skripti korduskäivitamine andmeid ei dubleeri (`ON CONFLICT DO NOTHING` või `WHERE NOT EXISTS`)
3. Uued klassifikaatoriväärtused lisatakse rakenduse kasutajaliidese kaudu (Administraatori juhend → Klassifikaatorid)

## Käsitsi ülevaatamist vajavad andmed

> **Enne toodangusse minekut tuleb mõned andmed käsitsi üle vaadata ja täiendada.**
> Liquibase laeb küll baasandmed sisse, kuid osad klassifikaatorid sisaldavad
> keskkonnaspetsiifilisi väärtusi (nt kontaktandmed, aadressid), mida automaatselt
> ei seadistata. Vaata täpsemaid märkusi failist [klassifikaatorid.md](klassifikaatorid.md).
