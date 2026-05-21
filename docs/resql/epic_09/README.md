---
epic: EPIC 09 - Klassifikaatorite haldamine
document_type: resql_queries
generated: 2026-05-21
version: 1.0
mode: create
---

> **Paigaldusjuhend:** [paigaldusjuhend.md](./paigaldusjuhend.md)

# EPIC 09 — RESQL päringud ja Ruuter ruutingud

## 1. Ülevaade

Loodi EPIC 09 classifier halduse jaoks RESQL ja Ruuter failid järgmistele endpointidele: `classifiers/list`, `classifiers/get`, `classifiers/update`, `classifier-values/list`, `classifier-values/check-code-exists`, `classifier-values/create`, `classifier-values/update`.
Read-päringud kasutavad `classifier_latest` ja `classifier_value_latest` snapshot-tabeleid.
Write-päringud järgivad append-only mustrit: ainult `INSERT` tabelitesse `classifier_name_state` ja `classifier_value_validity_state` ning seejärel snapshoti uuendav `INSERT` latest tabelisse.
Kõik endpointid on POST all `iam/classifier` ja `iam/classifier_value` puus, lisatud ka mock variandid.

## 2. Loodud failid

### RESQL
- `Resql/DSL/dev/POST/iam/classifier/list.sql`
- `Resql/DSL/dev/POST/iam/classifier/get.sql`
- `Resql/DSL/dev/POST/iam/classifier/update.sql`
- `Resql/DSL/dev/POST/iam/classifier/mock_list.sql`
- `Resql/DSL/dev/POST/iam/classifier/mock_get.sql`
- `Resql/DSL/dev/POST/iam/classifier/mock_update.sql`
- `Resql/DSL/dev/POST/iam/classifier_value/list.sql`
- `Resql/DSL/dev/POST/iam/classifier_value/check_code_exists.sql`
- `Resql/DSL/dev/POST/iam/classifier_value/create.sql`
- `Resql/DSL/dev/POST/iam/classifier_value/update.sql`
- `Resql/DSL/dev/POST/iam/classifier_value/mock_list.sql`
- `Resql/DSL/dev/POST/iam/classifier_value/mock_check_code_exists.sql`
- `Resql/DSL/dev/POST/iam/classifier_value/mock_create.sql`
- `Resql/DSL/dev/POST/iam/classifier_value/mock_update.sql`

### Ruuter
- `Ruuter/DSL/dev/POST/iam/classifier/.guard`
- `Ruuter/DSL/dev/POST/iam/classifier/list.yml`
- `Ruuter/DSL/dev/POST/iam/classifier/get.yml`
- `Ruuter/DSL/dev/POST/iam/classifier/update.yml`
- `Ruuter/DSL/dev/POST/iam/classifier/mock_list.yml`
- `Ruuter/DSL/dev/POST/iam/classifier/mock_get.yml`
- `Ruuter/DSL/dev/POST/iam/classifier/mock_update.yml`
- `Ruuter/DSL/dev/POST/iam/classifier_value/.guard`
- `Ruuter/DSL/dev/POST/iam/classifier_value/list.yml`
- `Ruuter/DSL/dev/POST/iam/classifier_value/check_code_exists.yml`
- `Ruuter/DSL/dev/POST/iam/classifier_value/create.yml`
- `Ruuter/DSL/dev/POST/iam/classifier_value/update.yml`
- `Ruuter/DSL/dev/POST/iam/classifier_value/mock_list.yml`
- `Ruuter/DSL/dev/POST/iam/classifier_value/mock_check_code_exists.yml`
- `Ruuter/DSL/dev/POST/iam/classifier_value/mock_create.yml`
- `Ruuter/DSL/dev/POST/iam/classifier_value/mock_update.yml`

## 3. Arhitektuuri vastavus

- INSERT-only write flow: jah
- UPDATE/DELETE puuduvad SQL failides: jah
- Read path `*_latest` snapshot tabelitelt: jah
- JOIN kasutus: puudub
- Mock fail olemas igale production failile: jah
