---
epic: EPIC 09 — Klassifikaatorite haldamine
document_type: paigaldusjuhend
generated: 2026-05-27
---

# EPIC 09 — RESQL ja Ruuter Paigaldusjuhend

## Ülevaade

Kõik selle EPICu RESQL ja Ruuter DSL failid luuakse otse vastavatesse süsteemikataloogidesse `DSL/Resql/` ja `DSL/Ruuter/`.

## SQL failid (RESQL)

| Sihtkoht |
|----------|
| `DSL/Resql/POST/iam/classifier/v1/list.sql` |
| `DSL/Resql/POST/iam/classifier/v1/mock_list.sql` |
| `DSL/Resql/POST/iam/classifier/v1/get.sql` |
| `DSL/Resql/POST/iam/classifier/v1/mock_get.sql` |
| `DSL/Resql/POST/iam/classifier/v1/update.sql` |
| `DSL/Resql/POST/iam/classifier/v1/mock_update.sql` |
| `DSL/Resql/POST/iam/classifier/v1/get_latest_name_state.sql` |
| `DSL/Resql/POST/iam/classifier/v1/mock_get_latest_name_state.sql` |
| `DSL/Resql/POST/iam/classifier_value/v1/list.sql` |
| `DSL/Resql/POST/iam/classifier_value/v1/mock_list.sql` |
| `DSL/Resql/POST/iam/classifier_value/v1/check_code_exists.sql` |
| `DSL/Resql/POST/iam/classifier_value/v1/mock_check_code_exists.sql` |
| `DSL/Resql/POST/iam/classifier_value/v1/create.sql` |
| `DSL/Resql/POST/iam/classifier_value/v1/mock_create.sql` |
| `DSL/Resql/POST/iam/classifier_value/v1/create_validity_state.sql` |
| `DSL/Resql/POST/iam/classifier_value/v1/mock_create_validity_state.sql` |
| `DSL/Resql/POST/iam/classifier_value/v1/update.sql` |
| `DSL/Resql/POST/iam/classifier_value/v1/mock_update.sql` |
| `DSL/Resql/POST/iam/classifier_value/v1/get_latest_validity_state.sql` |
| `DSL/Resql/POST/iam/classifier_value/v1/mock_get_latest_validity_state.sql` |
| `DSL/Resql/POST/state_updater/classifier_latest/build.sql` |
| `DSL/Resql/POST/state_updater/classifier_latest/mock_build.sql` |
| `DSL/Resql/POST/state_updater/classifier_value_latest/build.sql` |
| `DSL/Resql/POST/state_updater/classifier_value_latest/mock_build.sql` |

**Märkus:** `mock_` prefiksiga failid kopeeritakse samasse kataloogi.

## Ruuter DSL failid

| Sihtkoht |
|----------|
| `DSL/Ruuter/api/POST/v1/admin/classifiers/.guard` |
| `DSL/Ruuter/api/POST/v1/admin/classifiers/list.yml` |
| `DSL/Ruuter/api/POST/v1/admin/classifiers/mock_list.yml` |
| `DSL/Ruuter/api/POST/v1/admin/classifiers/get.yml` |
| `DSL/Ruuter/api/POST/v1/admin/classifiers/mock_get.yml` |
| `DSL/Ruuter/api/POST/v1/admin/classifiers/update.yml` |
| `DSL/Ruuter/api/POST/v1/admin/classifiers/mock_update.yml` |
| `DSL/Ruuter/api/POST/v1/admin/classifier-values/.guard` |
| `DSL/Ruuter/api/POST/v1/admin/classifier-values/list.yml` |
| `DSL/Ruuter/api/POST/v1/admin/classifier-values/mock_list.yml` |
| `DSL/Ruuter/api/POST/v1/admin/classifier-values/check_code_exists.yml` |
| `DSL/Ruuter/api/POST/v1/admin/classifier-values/mock_check_code_exists.yml` |
| `DSL/Ruuter/api/POST/v1/admin/classifier-values/create.yml` |
| `DSL/Ruuter/api/POST/v1/admin/classifier-values/mock_create.yml` |
| `DSL/Ruuter/api/POST/v1/admin/classifier-values/update.yml` |
| `DSL/Ruuter/api/POST/v1/admin/classifier-values/mock_update.yml` |

## Paigaldamise järjekord

1. Kopeeri SQL failid `DSL/Resql/` alla
2. Käivita `docker compose restart resql` (RESQL laeb failid automaatselt)
3. Kopeeri Ruuter YML ja `.guard` failid `DSL/Ruuter/` alla
4. Ruuter rakendab muudatused automaatselt (restart ei ole vajalik)
5. Kontrolli logidest, et uued endpointid on saadaval

## Viited

- Andmemudel: `docs/data_model.md`
- Error handling: `docs/db_errorhandling_rules.md`
- Epic DSL plaan: `docs/imp/epic_09_dsl_plan.md`
- Päringute dokumentatsioon: `docs/resql/epic_09/README.md`
