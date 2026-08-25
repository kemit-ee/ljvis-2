# Andmehaldus — Liquibase referentsandmed

LJVIS2 süsteemi töötamiseks vajalikud referentsandmed (klassifikaatorid, õigused, asutused) laetakse andmebaasi automaatselt Liquibase migratsioonidega asukohas:

`DSL/Liquibase/changelog/`

## Mis andmed lähevad Liquibase kaudu baasi?

| Andmetüüp | Kirjeldus | Dokument |
|---|---|---|
| **Klassifikaatorid** | Dropdown-menüüde valikud (riikide loend, ERRU staatused, vormide tüübid, rikkumiskoodid jt) | [klassifikaatorid.md](klassifikaatorid.md) |
| **Õigused** | Kasutajagruppidele määratavad süsteemiõigused (permission koodid + kirjeldused) | [oigused.md](oigused.md) |
| **Asutused** | Organisatsioonid, millele kasutajaid saab luua | [organisatsioonid.md](organisatsioonid.md) |

## Kuidas see töötab?

1. Liquibase jookseb automaatselt konteinerite käivitamisel (`docker compose up`)
2. Migratsioonid on **idempotentsed** — sama skripti korduskäivitamine andmeid ei dubleeri (`ON CONFLICT DO NOTHING` või `WHERE NOT EXISTS`)
3. Uued klassifikaatoriväärtused lisatakse rakenduse kasutajaliidese kaudu (Administraatori juhend → Klassifikaatorid)

## Käsitsi ülevaatamist vajavad andmed

> **Enne toodangusse minekut tuleb mõned andmed käsitsi üle vaadata ja täiendada.**
> Liquibase laeb küll baasandmed sisse, kuid osad klassifikaatorid sisaldavad
> keskkonnaspetsiifilisi väärtusi (nt kontaktandmed, aadressid), mida automaatselt
> ei seadistata. Vaata täpsemaid märkusi failist [klassifikaatorid.md](klassifikaatorid.md).
