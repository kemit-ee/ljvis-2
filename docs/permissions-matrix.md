---
document_type: permissions_matrix
generated: 2026-04-27
mode: create
changelog:
  - date: 2026-04-27
    changes: "Initial matrix bootstrapped from EPIC 02 tasks 04, 05, 06. Conflict resolved: GET /api/v1/admin/permissions/list guard set to perm_user_group_edit_admin only (Task 05 authoritative)."
  - date: 2026-04-27
    changes: "Privilege code naming convention adopted: resource.action with optional .admin / .local suffix for dual-scope read/list actions. Admin-only actions stay scope-less. §2 split user_group.list / user_group.read / user_group.list_users into .admin and .local variants. §3 endpoint table updated to use scoped codes. §4 clarified that scope is enforced both by the privilege code suffix and by the .guard organisationId filter. GET /api/v1/admin/permissions/list guard tightened to permission.list (admin-only) — supersedes the earlier conflict resolution note. Tasks 01–03 user.* codes deferred to a follow-up; matrix currently covers only EPIC 02 user-group / organisation / permission resources."
  - date: 2026-04-28
    changes: "Feedback cleanup: removed §1 Rollide loetelu (roles are only general guidance; privileges come from user groups). Renamed §2 column header 'Kood (resource.action[.scope])' → 'Kood'. Stripped role mentions (Admin-ainult) from Kirjeldus cells. Removed 'Lubatud rollid' column from the endpoint table. Removed §4 Autentimise ja autoriseerimise põhimõtted (belongs in a separate document). Sections renumbered: §2 → §1, §3 → §2."
  - date: 2026-04-29
    changes: "Added `user` resource entries (Tasks 01–03): user.list.admin/.local, user.read.admin/.local, user.edit.admin/.local. Added 9 user-endpoint rows to §2 API-otspunktide ligipääsu maatriks. Legacy perm_user_* codes are now fully superseded."
  - date: 2026-04-30
    changes: "Added EPIC 04 classifier entries: classifier.list, classifier.read, classifier.edit, classifier_value.edit. Added 9 classifier-endpoint rows to §2. Legacy perm_classifier_* codes are now fully superseded."
  - date: 2026-05-13
    changes: "EPIC 04 re-validation (tasks 01–04). Removed 2 classifier-endpoint rows not traceable to any task spec (classifiers/check-code-exists, classifiers/create). Fixed classifier-values/check-code-exists and classifier-values/create permissions: classifier.edit OR classifier_value.edit → classifier_value.edit only (Task 04 spec authoritative). Updated classifier.edit description to reflect update-only scope."
  - date: 2026-07-07
    changes: "Regenerated §2 against current openapi.yaml paths (RESTful GET/POST/PUT/DELETE surface). Added operationId column so contract linting can verify the link mechanically. Every row references an operationId that exists in docs/openapi.yaml. Prior /api/v1/admin/* RPC-style paths (which no longer exist in the contract) removed."
  - date: 2026-07-09
    changes: "Introduced x-permissions extension in docs/openapi.yaml as the authoritative source of per-operation permission requirements. §2 preamble updated to describe openapi as source of truth. Added scripts/lint-permissions-matrix.sh to enforce three invariants in CI: (a) every operationId has a non-empty x-permissions block, (b) every openapi operationId appears in matrix §2, (c) every matrix §2 operationId exists in openapi."
    changes: "Added audit.read and audit.verify to §1; added getLogsVerify row to §2.5 backing the new GET /v1/logs/verify hash-chain integrity endpoint. See docs/audit-logging.md §Hash chain integrity."
---

# Permissions Matrix

## 1. Resource-based permissions

| Resource       | Action                    | Code                                     | Description                                                                                              |
| -------------- | ------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `user_group`   | `list` (admin scope)      | `user_group.list.admin`                  | View the user-group list across all organisations.                                                       |
| `user_group`   | `list` (local scope)      | `user_group.list.local`                  | View the user-group list restricted to groups linked to the caller's organisation.                       |
| `user_group`   | `read` (admin scope)      | `user_group.read.admin`                  | View a user group's data across all groups.                                                              |
| `user_group`   | `read` (local scope)      | `user_group.read.local`                  | View a user group's data restricted to groups linked to the caller's organisation.                       |
| `user_group`   | `create`                  | `user_group.create`                      | Create a new user group.                                                                                 |
| `user_group`   | `update`                  | `user_group.update`                      | Update a user group's name and its organisation and permission links.                                    |
| `user_group`   | `list_users` (admin)      | `user_group.list_users.admin`            | Paginated list of a user group's active members across all organisations.                                |
| `user_group`   | `list_users` (local)      | `user_group.list_users.local`            | Paginated list of a user group's active members restricted to the caller's organisation.                 |
| `user_group`   | `search_eligible_users`   | `user_group.search_eligible_users`       | Search for users eligible to be linked to a group.                                                       |
| `user_group`   | `add_user`                | `user_group.add_user`                    | Bind user(s) to a user group.                                                                            |
| `user_group`   | `remove_user`             | `user_group.remove_user`                 | Remove a user from a user group.                                                                         |
| `user`         | `list` (admin scope)      | `user.list.admin`                        | View the user list across all organisations.                                                             |
| `user`         | `list` (local scope)      | `user.list.local`                        | View the user list restricted to the caller's organisation.                                              |
| `user`         | `read` (admin scope)      | `user.read.admin`                        | View a user's data across all organisations.                                                             |
| `user`         | `read` (local scope)      | `user.read.local`                        | View a user's data restricted to the caller's organisation.                                              |
| `user`         | `edit` (admin scope)      | `user.edit.admin`                        | Add, view, and update users across all organisations.                                                    |
| `user`         | `edit` (local scope)      | `user.edit.local`                        | Add, view, and update users restricted to the caller's organisation.                                     |
| `organisation` | `list`                    | `organisation.list`                      | Load the organisation catalogue for UI pickers (modals, accordion tables).                               |
| `permission`   | `list`                    | `permission.list`                        | Load the permission catalogue for UI pickers (used only in edit mode).                                   |
| `classifier`   | `list`                    | `classifier.list`                        | View the classifier list (whole system-wide catalogue).                                                  |
| `classifier`   | `read`                    | `classifier.read`                        | Open a classifier's detail view (header + value list).                                                   |
| `classifier`   | `edit`                    | `classifier.edit`                        | Update a classifier's header (name, description); code is immutable.                                     |
| `classifier_value` | `edit`                | `classifier_value.edit`                  | Add classifier values and update their validity period (incl. ending and re-opening validity).           |
| `audit`        | `read`                    | `audit.read`                             | Read audit log entries and export CSV.                                                                   |
| `audit`        | `verify`                  | `audit.verify`                           | Walk the audit hash chain and confirm integrity. Privileged reader permission separate from `audit.read`. |

## 2. API endpoint access matrix

> Each row corresponds to one `docs/openapi.yaml` `operationId`. The OpenAPI
> spec carries the authoritative permission requirement per operation as a
> non-standard `x-permissions` extension:
>
> ```yaml
> operationId: getUser
> x-permissions:
>   anyOf: [user.read.admin, user.read.local]
> ```
>
> This table is a rendered view of that data. Ruuter `.guard` files consume
> the same `x-permissions` values, so a single edit in `openapi.yaml`
> updates the contract, the runtime check, and this documentation in one
> step.
>
> CI runs `scripts/lint-permissions-matrix.sh` on every change: every
> matrix-row `operationId` must exist in the OpenAPI, every `operationId`
> must be covered here, and every operation must have a non-empty
> `x-permissions` block.

### 2.1 User groups

| Endpoint                                | HTTP   | operationId                    | Required permissions                                           |
| --------------------------------------- | ------ | ------------------------------ | -------------------------------------------------------------- |
| `/v1/user-groups/{scope}/search`        | GET    | `getUserGroups`                | `user_group.list.admin` OR `user_group.list.local`             |
| `/v1/user-groups/{scope}`               | GET    | `getUserGroup`                 | `user_group.read.admin` OR `user_group.read.local`             |
| `/v1/user-groups`                       | POST   | `postUserGroups`               | `user_group.create`                                            |
| `/v1/user-groups`                       | PUT    | `putUserGroup`                 | `user_group.update`                                            |
| `/v1/user-groups/{scope}/organisations` | GET    | `getUserGroupOrganisations`    | `user_group.read.admin` OR `user_group.read.local`             |
| `/v1/user-groups/organisations`         | PUT    | `putUserGroupOrganisations`    | `user_group.update`                                            |
| `/v1/user-groups/{scope}/permissions`   | GET    | `getUserGroupPermissions`      | `user_group.read.admin` OR `user_group.read.local`             |
| `/v1/user-groups/permissions`           | PUT    | `putUserGroupPermissions`      | `user_group.update`                                            |
| `/v1/user-groups/{scope}/users`         | GET    | `getUserGroupUsers`            | `user_group.list_users.admin` OR `user_group.list_users.local` |
| `/v1/user-groups/users`                 | PUT    | `putUserGroupUsers`            | `user_group.add_user`                                          |
| `/v1/user-groups/user`                  | DELETE | `deleteUserGroupUser`          | `user_group.remove_user`                                       |
| `/v1/user-groups/available-users`       | POST   | `postUserGroupsAvailableUsers` | `user_group.search_eligible_users`                             |

### 2.2 Users

| Endpoint                                | HTTP   | operationId                    | Required permissions                                           |
| --------------------------------------- | ------ | ------------------------------ | -------------------------------------------------------------- |
| `/v1/users/{scope}/search`              | GET    | `getUsers`                     | `user.list.admin` OR `user.list.local`                         |
| `/v1/users/{scope}`                     | GET    | `getUser`                      | `user.read.admin` OR `user.read.local`                         |
| `/v1/users/{scope}`                     | POST   | `postUsers`                    | `user.edit.admin` OR `user.edit.local`                         |
| `/v1/users/{scope}`                     | PUT    | `putUser`                      | `user.edit.admin` OR `user.edit.local`                         |
| `/v1/users/{scope}/groups`              | GET    | `getUserGroups2`               | `user.read.admin` OR `user.read.local`                         |
| `/v1/users/{scope}/groups`              | PUT    | `putUserGroups`                | `user.edit.admin` OR `user.edit.local`                         |
| `/v1/users/{scope}/check-personal-code` | POST   | `postUsersCheckPersonalCode`   | `user.edit.admin` OR `user.edit.local`                         |

### 2.3 Classifiers

| Endpoint                          | HTTP | operationId                    | Required permissions    |
| --------------------------------- | ---- | ------------------------------ | ----------------------- |
| `/v1/classifiers`                 | GET  | `getClassifiers`               | `classifier.list`       |
| `/v1/classifiers/classifier`      | GET  | `getClassifier`                | `classifier.read`       |
| `/v1/classifiers/classifier`      | PUT  | `putClassifier`                | `classifier.edit`       |
| `/v1/classifiers/values`          | GET  | `getClassifierValues`          | `classifier.read`       |
| `/v1/classifiers/value`           | GET  | `getClassifierValue`           | `classifier.read`       |
| `/v1/classifiers/value`           | POST | `postClassifierValue`          | `classifier_value.edit` |
| `/v1/classifiers/value`           | PUT  | `putClassifierValue`           | `classifier_value.edit` |
| `/v1/classifiers/check-code`      | POST | `postClassifierValuesCheckCode`| `classifier_value.edit` |
| `/v1/classifiers/catalogue`       | GET  | `getClassifiersCatalogue`      | `classifier.list`       |

### 2.4 Organisations and permissions

| Endpoint            | HTTP | operationId          | Required permissions |
| ------------------- | ---- | -------------------- | ------------------- |
| `/v1/organisations` | GET  | `getOrganisations`   | `organisation.list` |
| `/v1/permissions`   | GET  | `getPermissions`     | `permission.list`   |

### 2.5 Audit logs

| Endpoint          | HTTP | operationId     | Required permissions |
| ----------------- | ---- | --------------- | -------------- |
| `/v1/logs`        | GET  | `getLogs`       | `audit.read`   |
| `/v1/logs/log`    | GET  | `getLog`        | `audit.read`   |
| `/v1/logs/export` | GET  | `getLogsExport` | `audit.read`   |
| `/v1/logs/verify` | GET  | `getLogsVerify` | `audit.verify` |

### 2.6 Foreign violation form

| Endpoint                                                            | HTTP | operationId                       | Required permissions              |
| ------------------------------------------------------------------- | ---- | --------------------------------- | --------------------------------- |
| `/api/v1/control-forms/foreign-violation`                           | POST | `postForeignViolationForm`        | `foreign_violation_form.write`    |
| `/api/v1/control-forms/foreign-violation/{formKey}`                 | GET  | `getForeignViolationForm`         | `foreign_violation_form.read`     |
| `/api/v1/control-forms/foreign-violation/{formKey}`                 | PUT  | `putForeignViolationForm`         | `foreign_violation_form.write`    |
| `/api/v1/control-forms/foreign-violation/{formKey}/files`           | GET  | `getForeignViolationFormFiles`    | `foreign_violation_form.read`     |
| `/api/v1/control-forms/foreign-violation/{formKey}/files`           | POST | `postForeignViolationFormFiles`   | `foreign_violation_form.write`    |
| `/api/v1/control-forms/foreign-violation/{formKey}/files/{fileId}`  | GET  | `getForeignViolationFormFile`     | `foreign_violation_form.read`     |
| `/api/v1/classifiers/violation-types`                               | GET  | `getClassifierViolationTypes`     | `classifier.read`                 |
| `/api/v1/classifiers/countries`                                     | GET  | `getClassifierCountries`          | `classifier.read`                 |

### 2.7 Authentication

| Endpoint             | HTTP | operationId          | Required permissions                     |
| -------------------- | ---- | -------------------- | ---------------------------------------- |
| `/auth/jwt/userinfo` | GET  | `getAuthJwtUserinfo` | — (valid JWT cookie; no permission check) |
| `/auth/logout`       | POST | `postAuthLogout`     | — (valid JWT cookie; no permission check) |
