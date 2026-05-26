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
RESQL sisemine leping on versioneeritud kujul `/dev/v1/iam/...`.
Ruuteri endpointid asuvad versioneeritud puus `api/v1/admin`, lisatud ka mock variandid.

## 2. Loodud failid

### RESQL
- `DSL/Resql/dev/POST/v1/iam/classifier/list.sql`
- `DSL/Resql/dev/POST/v1/iam/classifier/get.sql`
- `DSL/Resql/dev/POST/v1/iam/classifier/update.sql`
- `DSL/Resql/dev/POST/v1/iam/classifier/mock_list.sql`
- `DSL/Resql/dev/POST/v1/iam/classifier/mock_get.sql`
- `DSL/Resql/dev/POST/v1/iam/classifier/mock_update.sql`
- `DSL/Resql/dev/POST/v1/iam/classifier_value/list.sql`
- `DSL/Resql/dev/POST/v1/iam/classifier_value/check_code_exists.sql`
- `DSL/Resql/dev/POST/v1/iam/classifier_value/create.sql`
- `DSL/Resql/dev/POST/v1/iam/classifier_value/update.sql`
- `DSL/Resql/dev/POST/v1/iam/classifier_value/mock_list.sql`
- `DSL/Resql/dev/POST/v1/iam/classifier_value/mock_check_code_exists.sql`
- `DSL/Resql/dev/POST/v1/iam/classifier_value/mock_create.sql`
- `DSL/Resql/dev/POST/v1/iam/classifier_value/mock_update.sql`

### Ruuter
- `DSL/Ruuter/api/POST/v1/admin/classifiers/.guard`
- `DSL/Ruuter/api/POST/v1/admin/classifiers/list.yml`
- `DSL/Ruuter/api/POST/v1/admin/classifiers/get.yml`
- `DSL/Ruuter/api/POST/v1/admin/classifiers/update.yml`
- `DSL/Ruuter/api/POST/v1/admin/classifiers/mock_list.yml`
- `DSL/Ruuter/api/POST/v1/admin/classifiers/mock_get.yml`
- `DSL/Ruuter/api/POST/v1/admin/classifiers/mock_update.yml`
- `DSL/Ruuter/api/POST/v1/admin/classifier-values/.guard`
- `DSL/Ruuter/api/POST/v1/admin/classifier-values/list.yml`
- `DSL/Ruuter/api/POST/v1/admin/classifier-values/check_code_exists.yml`
- `DSL/Ruuter/api/POST/v1/admin/classifier-values/create.yml`
- `DSL/Ruuter/api/POST/v1/admin/classifier-values/update.yml`
- `DSL/Ruuter/api/POST/v1/admin/classifier-values/mock_list.yml`
- `DSL/Ruuter/api/POST/v1/admin/classifier-values/mock_check_code_exists.yml`
- `DSL/Ruuter/api/POST/v1/admin/classifier-values/mock_create.yml`
- `DSL/Ruuter/api/POST/v1/admin/classifier-values/mock_update.yml`

## 3. Arhitektuuri vastavus

- INSERT-only write flow: jah
- UPDATE/DELETE puuduvad SQL failides: jah
- Read path `*_latest` snapshot tabelitelt: jah
- JOIN kasutus: puudub
- Mock fail olemas igale production failile: jah
