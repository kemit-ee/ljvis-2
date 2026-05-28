---
epic: EPIC 02 - Kasutajate haldamine
document_type: resql_queries
generated: 2026-05-27
version: 1.0
mode: create
---

> **Paigaldusjuhend:** [paigaldusjuhend.md](./paigaldusjuhend.md)

# EPIC 02 — RESQL päringud ja Ruuter ruutingud

## 1. Ülevaade

Loodi EPIC 02 kasutajate ja kasutajagruppide halduse jaoks RESQL ja Ruuter failid järgmistele endpointidele:
- `users/list`, `users/get`, `users/check-personal-code-exists`, `users/create`, `users/update`, `users/change-organisation`
- `users/organisations/options`
- `users/user-groups/get`, `users/user-groups/available`, `users/user-groups/save`
- `user-groups/list`, `user-groups/get`, `user-groups/create`, `user-groups/update`
- `user-groups/users/list`, `user-groups/users/search-eligible`, `user-groups/users/add`, `user-groups/users/remove`
- `organisations/list`
- `permissions/list` (GET)

Read-päringud kasutavad `user_account_latest` ja `user_group_latest` snapshot-tabeleid.
Write-päringud järgivad append-only mustrit (ainult `INSERT`) ning kasutavad `state_updater` moodulit snapshot rebuild'iks.
RESQL sisemine leping: `/ljvis2/iam/.../v1/...` ja `/ljvis2/state_updater/...`.
Source repo SQL failid paiknevad kujul `DSL/Resql/ljvis2/<MEETOD>/iam/<entiteet>/v1/*.sql` ja `DSL/Resql/ljvis2/POST/state_updater/<entiteet>/*.sql`; RESQL runtime laeb need projekti all kujul `/DSL/ljvis2/<MEETOD>/iam/<entiteet>/v1/*.sql`.

## 2. Loodud failid

### RESQL — iam/user
- `DSL/Resql/ljvis2/POST/iam/user/v1/list.sql`
- `DSL/Resql/ljvis2/POST/iam/user/v1/mock_list.sql`
- `DSL/Resql/ljvis2/POST/iam/user/v1/get.sql`
- `DSL/Resql/ljvis2/POST/iam/user/v1/mock_get.sql`
- `DSL/Resql/ljvis2/POST/iam/user/v1/check_personal_code_exists.sql`
- `DSL/Resql/ljvis2/POST/iam/user/v1/mock_check_personal_code_exists.sql`
- `DSL/Resql/ljvis2/POST/iam/user/v1/create.sql`
- `DSL/Resql/ljvis2/POST/iam/user/v1/mock_create.sql`
- `DSL/Resql/ljvis2/POST/iam/user/v1/update.sql`
- `DSL/Resql/ljvis2/POST/iam/user/v1/mock_update.sql`
- `DSL/Resql/ljvis2/POST/iam/user/v1/change_organisation.sql`
- `DSL/Resql/ljvis2/POST/iam/user/v1/mock_change_organisation.sql`

### RESQL — iam/user_group_membership
- `DSL/Resql/ljvis2/POST/iam/user_group_membership/v1/get.sql`
- `DSL/Resql/ljvis2/POST/iam/user_group_membership/v1/mock_get.sql`
- `DSL/Resql/ljvis2/POST/iam/user_group_membership/v1/available.sql`
- `DSL/Resql/ljvis2/POST/iam/user_group_membership/v1/mock_available.sql`
- `DSL/Resql/ljvis2/POST/iam/user_group_membership/v1/save.sql`
- `DSL/Resql/ljvis2/POST/iam/user_group_membership/v1/mock_save.sql`

### RESQL — iam/user_group
- `DSL/Resql/ljvis2/POST/iam/user_group/v1/list.sql`
- `DSL/Resql/ljvis2/POST/iam/user_group/v1/mock_list.sql`
- `DSL/Resql/ljvis2/POST/iam/user_group/v1/get.sql`
- `DSL/Resql/ljvis2/POST/iam/user_group/v1/mock_get.sql`
- `DSL/Resql/ljvis2/POST/iam/user_group/v1/create.sql`
- `DSL/Resql/ljvis2/POST/iam/user_group/v1/mock_create.sql`
- `DSL/Resql/ljvis2/POST/iam/user_group/v1/update.sql`
- `DSL/Resql/ljvis2/POST/iam/user_group/v1/mock_update.sql`
- `DSL/Resql/ljvis2/POST/iam/user_group/v1/list_users.sql`
- `DSL/Resql/ljvis2/POST/iam/user_group/v1/mock_list_users.sql`
- `DSL/Resql/ljvis2/POST/iam/user_group/v1/search_eligible_users.sql`
- `DSL/Resql/ljvis2/POST/iam/user_group/v1/mock_search_eligible_users.sql`
- `DSL/Resql/ljvis2/POST/iam/user_group/v1/add_user.sql`
- `DSL/Resql/ljvis2/POST/iam/user_group/v1/mock_add_user.sql`
- `DSL/Resql/ljvis2/POST/iam/user_group/v1/remove_user.sql`
- `DSL/Resql/ljvis2/POST/iam/user_group/v1/mock_remove_user.sql`

### RESQL — iam/organisation
- `DSL/Resql/ljvis2/POST/iam/organisation/v1/list.sql`
- `DSL/Resql/ljvis2/POST/iam/organisation/v1/mock_list.sql`

### RESQL — iam/permission (GET)
- `DSL/Resql/ljvis2/GET/iam/permission/v1/list.sql`
- `DSL/Resql/ljvis2/GET/iam/permission/v1/mock_list.sql`

### RESQL — state_updater
- `DSL/Resql/ljvis2/POST/state_updater/user_account_latest/build.sql`
- `DSL/Resql/ljvis2/POST/state_updater/user_account_latest/mock_build.sql`
- `DSL/Resql/ljvis2/POST/state_updater/user_group_latest/build.sql`
- `DSL/Resql/ljvis2/POST/state_updater/user_group_latest/mock_build.sql`

### Ruuter — users
- `DSL/Ruuter/api/POST/v1/admin/users/.guard`
- `DSL/Ruuter/api/POST/v1/admin/users/list.yml`
- `DSL/Ruuter/mockapi/POST/v1/admin/users/.guard`
- `DSL/Ruuter/mockapi/POST/v1/admin/users/list.yml`
- `DSL/Ruuter/api/POST/v1/admin/users/get.yml`
- `DSL/Ruuter/mockapi/POST/v1/admin/users/get.yml`
- `DSL/Ruuter/api/POST/v1/admin/users/check-personal-code-exists.yml`
- `DSL/Ruuter/mockapi/POST/v1/admin/users/check-personal-code-exists.yml`
- `DSL/Ruuter/api/POST/v1/admin/users/create.yml`
- `DSL/Ruuter/mockapi/POST/v1/admin/users/create.yml`
- `DSL/Ruuter/api/POST/v1/admin/users/update.yml`
- `DSL/Ruuter/mockapi/POST/v1/admin/users/update.yml`
- `DSL/Ruuter/api/POST/v1/admin/users/change-organisation.yml`
- `DSL/Ruuter/mockapi/POST/v1/admin/users/change-organisation.yml`
- `DSL/Ruuter/api/POST/v1/admin/users/organisations/options.yml`
- `DSL/Ruuter/mockapi/POST/v1/admin/users/organisations/options.yml`
- `DSL/Ruuter/api/POST/v1/admin/users/user-groups/get.yml`
- `DSL/Ruuter/mockapi/POST/v1/admin/users/user-groups/get.yml`
- `DSL/Ruuter/api/POST/v1/admin/users/user-groups/available.yml`
- `DSL/Ruuter/mockapi/POST/v1/admin/users/user-groups/available.yml`
- `DSL/Ruuter/api/POST/v1/admin/users/user-groups/save.yml`
- `DSL/Ruuter/mockapi/POST/v1/admin/users/user-groups/save.yml`

### Ruuter — user-groups
- `DSL/Ruuter/api/POST/v1/admin/user-groups/.guard`
- `DSL/Ruuter/api/POST/v1/admin/user-groups/list.yml`
- `DSL/Ruuter/mockapi/POST/v1/admin/user-groups/.guard`
- `DSL/Ruuter/mockapi/POST/v1/admin/user-groups/list.yml`
- `DSL/Ruuter/api/POST/v1/admin/user-groups/get.yml`
- `DSL/Ruuter/mockapi/POST/v1/admin/user-groups/get.yml`
- `DSL/Ruuter/api/POST/v1/admin/user-groups/create.yml`
- `DSL/Ruuter/mockapi/POST/v1/admin/user-groups/create.yml`
- `DSL/Ruuter/api/POST/v1/admin/user-groups/update.yml`
- `DSL/Ruuter/mockapi/POST/v1/admin/user-groups/update.yml`
- `DSL/Ruuter/api/POST/v1/admin/user-groups/users/list.yml`
- `DSL/Ruuter/mockapi/POST/v1/admin/user-groups/users/list.yml`
- `DSL/Ruuter/api/POST/v1/admin/user-groups/users/search-eligible.yml`
- `DSL/Ruuter/mockapi/POST/v1/admin/user-groups/users/search-eligible.yml`
- `DSL/Ruuter/api/POST/v1/admin/user-groups/users/add.yml`
- `DSL/Ruuter/mockapi/POST/v1/admin/user-groups/users/add.yml`
- `DSL/Ruuter/api/POST/v1/admin/user-groups/users/remove.yml`
- `DSL/Ruuter/mockapi/POST/v1/admin/user-groups/users/remove.yml`

### Ruuter — organisations
- `DSL/Ruuter/api/POST/v1/admin/organisations/.guard`
- `DSL/Ruuter/api/POST/v1/admin/organisations/list.yml`
- `DSL/Ruuter/mockapi/POST/v1/admin/organisations/.guard`
- `DSL/Ruuter/mockapi/POST/v1/admin/organisations/list.yml`

### Ruuter — permissions (GET)
- `DSL/Ruuter/api/GET/v1/admin/permissions/.guard`
- `DSL/Ruuter/api/GET/v1/admin/permissions/list.yml`
- `DSL/Ruuter/mockapi/GET/v1/admin/permissions/.guard`
- `DSL/Ruuter/mockapi/GET/v1/admin/permissions/list.yml`

## 3. Arhitektuuri vastavus

- INSERT-only write flow: jah
- UPDATE/DELETE puuduvad SQL failides: jah
- Read path `*_latest` snapshot tabelitelt: jah
- JOIN kasutus: puudub
- Mock fail olemas igale production failile: jah
- state_updater kasutusel kõigi write voogude lõpus: jah
- Scope enforcement (lokaalne kontohaldur): jah, `list` YML-ides

## 7. Muudatuste logi

| Versioon | Kuupäev | Muudatus | Autor |
|---------|---------|---------|-------|
| 1.0 | 2026-05-27 | Epic 02 algne loomine. Kõik kasutajate ja kasutajagruppide halduse DSL failid loodud `feature/epic_02_dsl` harul. | cascade |
