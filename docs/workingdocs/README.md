# Töödokumendid

See kataloog sisaldab LJVIS2 arenduse, arhitektuuri ja kasutuselevõtu olulisi töödokumente, mis ei ole lõppkasutaja kasutus- ega administraatorijuhendi peatükid.

## Dokumendikategooriad

| Kategooria | Dokumendid | Sisu |
|---|---|---|
| Arhitektuur ja andmemudel | `LJVIS_arhitektuur.md`, `data_model.md`, `database-schema-denormalized.md`, `epic_data_model_v2.md` | Süsteemi arhitektuur, andmemudel ja skeemikirjeldused |
| Paigaldus ja taristu | `admin-deployment-guide.md`, `infrastructure-access-view.md`, `infrastructure-diagram.md` | Keskkondade, võrgupiirangute ja kasutuselevõtu kirjeldused |
| API ja integratsioonid | `api-endpoints.md`, `rest-api-design-guide.md`, `rest-api-disainijuhend.md`, `openapi.yaml` | API otspunktid, API kujundamise põhimõtted ja OpenAPI leping |
| X-tee | `xtee_implementatsioon.md` | X-tee kliendi- ja teenusepakkuja integratsioon |
| Andmebaas ja migratsioonid | `db_errorhandling_rules.md`, `migration_guide_to_rust_ruuter.md` | Andmebaasi veakäsitlus ja Ruuteri migratsiooni juhised |
| Turvalisus ja logimine | `audit-logging.md`, `logging-spec.md`, `permissions-matrix.md` | Auditilogimine, logimise nõuded ja õiguste maatriks |
| Klassifikaatorid | `classifier-caching.md`, `classifier-denormalized-query-examples.md` | Klassifikaatorite API, päringud ja esikülje vahemälu |
| Planeerimine ja järelejäänud tööd | `kasutusjuhend_todo.md`, `known-issues.md`, `use-cases-ljvis.md` | Dokumentatsiooni tööjärg, teadaolevad probleemid ja kasutusjuhud |

## Dokumendid, mis jäid `docs/` juurkausta

- `README.md` — dokumentatsiooni üldine sissejuhatus
- `SUMMARY.md` — dokumentatsiooni sisukord
- `openapi.yaml` — masinloetav OpenAPI kirjeldus
- `errors.json` — API veakoodide andmestik
- `book/` — genereeritud dokumentatsiooniraamat
- `andmehaldus/` — Liquibase'i kaudu laaditavate lähteandmete dokumentatsioon
- `user-guide/` ja `admin-guide/` — lõppkasutaja ja administraatori peatükid

Need failid ja kataloogid jäid juurkausta, sest neid kasutatakse dokumentatsiooni avaldamise sisendina või need on lõppkasutajale suunatud dokumentatsiooni põhiosad.

## Viited

- [Andmehaldus](../andmehaldus/README.md)
- [Dokumentatsiooni sisukord](../SUMMARY.md)
- [API otspunktid](api-endpoints.md)
- [Administraatori paigaldus- ja seadistusjuhend](admin-deployment-guide.md)
- [Klassifikaatorite vahemälu](classifier-caching.md)
