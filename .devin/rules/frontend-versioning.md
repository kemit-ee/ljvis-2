---
description: "Frontend version bump rules for LJVIS2"
trigger: always_on
---

# Frontenid versioonimisreegel

Iga PR, mis muudab `frontend/` kausta faile, peab bumping'ma versiooni
`frontend/package.json`-is vastavalt Semantic Versioning loogikale.

## Versioonitõusu tüüp

| Muutus | Tüüp | Näide |
|--------|------|-------|
| Veaparandus, väike UI-tweak, teksti muutus | **PATCH** `x.y.Z` | `1.0.0 → 1.0.1` |
| Uus funktsionaalsus (uus vorm, moodul, suurem UI muutus) | **MINOR** `x.Y.0` | `1.0.0 → 1.1.0` |
| Murdev muutus arhitektuuris või API-s | **MAJOR** `X.0.0` | `1.0.0 → 2.0.0` |

## Reeglid

- Ühes PR-is tehakse täpselt **üks versioonitõus**
- Mitme muutuse korral vali **kõige suurem** tüüp (nt veaparandus + uus funktsioon → MINOR)
- Kui PR muudab ainult DSL/Ruuter/Resql/Liquibase faile (ei puutu frontendi), versiooni **ei bumbi**
- Versiooni muutmine kuulub samasse commiti mis funktsionaalsed muutused — mitte eraldi commit
