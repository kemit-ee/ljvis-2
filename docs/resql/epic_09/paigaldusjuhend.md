---
epic: EPIC 09 — Klassifikaatorite haldamine
document_type: paigaldusjuhend
generated: 2026-05-21
---

# EPIC 09 — RESQL ja Ruuter paigaldusjuhend

## Ülevaade

Selle EPICu failid loodi otse `Resql/DSL/dev/` ja `Ruuter/DSL/dev/` alla branchis `feature/epic_09_dsl`.

## SQL failid (RESQL)

- Asukoht: `Resql/DSL/dev/POST/iam/classifier/*.sql`
- Asukoht: `Resql/DSL/dev/POST/iam/classifier_value/*.sql`

## Ruuter failid

- Asukoht: `Ruuter/DSL/dev/POST/iam/classifier/*.yml`
- Asukoht: `Ruuter/DSL/dev/POST/iam/classifier_value/*.yml`
- Guardid:
  - `Ruuter/DSL/dev/POST/iam/classifier/.guard`
  - `Ruuter/DSL/dev/POST/iam/classifier_value/.guard`

## Kontrolljärjekord

1. Kontrolli, et RESQL endpointid laevad (`Resql` logid).
2. Kontrolli Ruuter endpointid:
   - `/api/v1/admin/classifiers/list`
   - `/api/v1/admin/classifiers/get`
   - `/api/v1/admin/classifiers/update`
   - `/api/v1/admin/classifier-values/list`
   - `/api/v1/admin/classifier-values/check-code-exists`
   - `/api/v1/admin/classifier-values/create`
   - `/api/v1/admin/classifier-values/update`
3. Kontrolli JWT/permission käitumine (`classifier.list`, `classifier.read`, `classifier.edit`, `classifier_value.edit`).
4. Kontrolli mock endpointid.
