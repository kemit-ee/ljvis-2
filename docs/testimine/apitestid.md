# API-testide nimekiri ja tulemused

> **Genereeritud fail — ära muuda käsitsi.** Allikas: päris testijooksu väljund, skript `scripts/generate-api-test-report.py`. Uuendamiseks käivita `bash tests/postman/run-all.sh` ja seejärel skript (vt [testiplaan](testiplaan.md) §7).

| | |
|---|---|
| Viimase testimise kuupäev | 01.10.2026 |
| Testitud versioon (commit) | `3acdcd97` |
| Keskkond | CI-pinu `docker-compose.ci.yml` (puhas andmebaas, testseemned `tests/bootstrap/`) |
| Newmani kollektsioone | 29 / 29 |
| Päringuid | 1033 |
| Kontrolle (assertion'eid) | 2265 — läbis **2265**, kukkus **0**, vahele jäetud 0 |
| Ruuteri DSL-stsenaariume | 52 — läbis 52 |
| X-tee arendaja-mocki teste | 69 — läbis 69 |

Testitüübid: **funktsionaalne** (äriloogika ja andmete püsivus), **regressioon** (varem parandatud vigade kordumise vältimine), **integratsioon** (X-tee, ERRU, Postkast, teised infosüsteemid), **töökindlus** (samaaegsus, versioonikonfliktid, transpordivead, korduskatsed, ajastatud tööd), **turve** (autentimine, õigused ja asutusepõhine ulatus, sisendi valideerimine).

## 1. Kokkuvõte kollektsioonide kaupa

| # | Moodul | Kollektsioon | Testitüübid | Päringuid | Kontrolle | Läbis | Kukkus | Kestus |
|---|---|---|---|---|---|---|---|---|
| 1 | Asutused | [`organisations`](#1-organisations) | funktsionaalne, turve | 5 | 13 | 13 | 0 | 0 s |
| 2 | Õigused | [`permissions`](#2-permissions) | funktsionaalne, turve | 5 | 26 | 26 | 0 | 0 s |
| 3 | Kasutajad | [`users`](#3-users) | funktsionaalne, turve, regressioon | 28 | 54 | 54 | 0 | 1 s |
| 4 | Kasutajagrupid | [`user-groups`](#4-user-groups) | funktsionaalne, turve, regressioon | 27 | 58 | 58 | 0 | 1 s |
| 5 | Klassifikaatorid | [`classifiers`](#5-classifiers) | funktsionaalne, turve, regressioon | 31 | 78 | 78 | 0 | 20 s |
| 6 | Koondvorm | [`compound-form`](#6-compound-form) | funktsionaalne, regressioon, turve | 11 | 27 | 27 | 0 | 6 s |
| 7 | Sõidu- ja puhkeaja vormid (juht, meeskonnaliige) | [`driverest-forms`](#7-driverest-forms) | funktsionaalne, regressioon, integratsioon | 33 | 60 | 60 | 0 | 12 s |
| 8 | Transpordiameti kontrollkaart (TRAM) | [`tram-control-card`](#8-tram-control-card) | funktsionaalne, regressioon | 26 | 51 | 51 | 0 | 10 s |
| 9 | Tööinspektsiooni kontrollkaart | [`labour-inspection`](#9-labour-inspection) | funktsionaalne, regressioon, integratsioon | 25 | 51 | 51 | 0 | 10 s |
| 10 | Välisriigi kontrollkaart | [`foreign-violation-form`](#10-foreign-violation-form) | funktsionaalne, regressioon | 30 | 59 | 59 | 0 | 17 s |
| 11 | ERRU CTUD (tegevusloa kontroll) | [`erru-ctud`](#11-erru-ctud) | funktsionaalne, integratsioon, töökindlus, turve | 61 | 148 | 148 | 0 | 23 s |
| 12 | ERRU CGR (mainepäring) | [`erru-cgr`](#12-erru-cgr) | funktsionaalne, integratsioon, töökindlus, turve | 63 | 150 | 150 | 0 | 23 s |
| 13 | ERRU RSI (tehnokontrolli teade) | [`erru-rsi`](#13-erru-rsi) | funktsionaalne, integratsioon, töökindlus, turve | 69 | 150 | 150 | 0 | 26 s |
| 14 | ERRU NCR (kontrollitulemuse teade) | [`erru-ncr`](#14-erru-ncr) | funktsionaalne, integratsioon, töökindlus, turve | 75 | 190 | 190 | 0 | 27 s |
| 15 | ERRU NU (sobimatusteade) | [`erru-nu`](#15-erru-nu) | funktsionaalne, integratsioon, töökindlus, turve | 107 | 236 | 236 | 0 | 31 s |
| 16 | ERRU XML-adapter | [`erru-xml-adapter`](#16-erru-xml-adapter) | integratsioon, töökindlus | 28 | 55 | 55 | 0 | 22 s |
| 17 | Sõiduki ja haagise tehnonõuete vormid | [`technical-check-forms`](#17-technical-check-forms) | funktsionaalne, regressioon | 31 | 62 | 62 | 0 | 11 s |
| 18 | Autoveo katkestamine | [`transport-interruption`](#18-transport-interruption) | funktsionaalne, regressioon | 22 | 50 | 50 | 0 | 8 s |
| 19 | Ohtlike veoste (ADR) vorm | [`adr-form`](#19-adr-form) | funktsionaalne, regressioon | 28 | 66 | 66 | 0 | 10 s |
| 20 | Hea maine vorm | [`good-repute-form`](#20-good-repute-form) | funktsionaalne, regressioon, integratsioon | 24 | 53 | 53 | 0 | 9 s |
| 21 | Vormiotsing | [`form-search`](#21-form-search) | funktsionaalne, turve | 17 | 32 | 32 | 0 | 6 s |
| 22 | X-tee pakutavad teenused (päringud) | [`xroad-provide-query`](#22-xroad-provide-query) | integratsioon, turve | 19 | 41 | 41 | 0 | 0 s |
| 23 | X-tee pakutavad teenused (kirjutamine) | [`xroad-provide-write`](#23-xroad-provide-write) | integratsioon, turve, töökindlus | 24 | 42 | 42 | 0 | 0 s |
| 24 | Riskitasemed | [`risk-scores`](#24-risk-scores) | funktsionaalne, regressioon | 31 | 103 | 103 | 0 | 1 s |
| 25 | Kodaniku vaade ja esindusõigus | [`citizen-representation`](#25-citizen-representation) | funktsionaalne, turve | 10 | 19 | 19 | 0 | 1 s |
| 26 | Ajastatud tööd (cron) | [`cron-jobs`](#26-cron-jobs) | töökindlus, integratsioon, regressioon | 105 | 220 | 220 | 0 | 2 s |
| 27 | Teavitused ja Postkast | [`notifications`](#27-notifications) | funktsionaalne, integratsioon, töökindlus | 34 | 59 | 59 | 0 | 12 s |
| 28 | Auditilogi | [`audit-log`](#28-audit-log) | funktsionaalne, turve | 19 | 35 | 35 | 0 | 0 s |
| 29 | Ametniku töölaud | [`dashboard`](#29-dashboard) | funktsionaalne, regressioon | 45 | 77 | 77 | 0 | 17 s |

## 2. Kukkunud kontrollid

Kukkunud kontrolle ei olnud.

## 3. Kõik kontrollid kollektsioonide kaupa

### 1. organisations

**Asutused** · testitüübid: funktsionaalne, turve · kollektsioon `tests/postman/collections/organisations.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 2 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 3 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 4 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 5 |  | GET /v1/organisations — no cookie → 401 | `GET /ljvis/v1/organisations` | Returns 401 without cookie | läbis |
| 6 |  | GET /v1/organisations — TARA user not registered in LJVIS → 403 | `GET /ljvis/v1/organisations` | Returns 403 for TARA user not registered in LJVIS | läbis |
| 7 |  | GET /v1/organisations — shape, content and sort order | `GET /ljvis/v1/organisations` | Returns 200 | läbis |
| 8 |  | GET /v1/organisations — shape, content and sort order | `GET /ljvis/v1/organisations` | Response is an array | läbis |
| 9 |  | GET /v1/organisations — shape, content and sort order | `GET /ljvis/v1/organisations` | Exactly 8 seeded organisations | läbis |
| 10 |  | GET /v1/organisations — shape, content and sort order | `GET /ljvis/v1/organisations` | Each org has id (number), name (string) and code (string) | läbis |
| 11 |  | GET /v1/organisations — shape, content and sort order | `GET /ljvis/v1/organisations` | No extra fields exposed (id, name and code only) | läbis |
| 12 |  | GET /v1/organisations — shape, content and sort order | `GET /ljvis/v1/organisations` | All seeded organisations present | läbis |
| 13 |  | GET /v1/organisations — shape, content and sort order | `GET /ljvis/v1/organisations` | Results sorted alphabetically by name | läbis |

### 2. permissions

**Õigused** · testitüübid: funktsionaalne, turve · kollektsioon `tests/postman/collections/permissions.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 2 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 3 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 4 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 5 |  | GET /v1/permissions — no cookie → 401 | `GET /ljvis/v1/permissions` | Returns 401 without cookie | läbis |
| 6 |  | GET /v1/permissions — TARA user not registered in LJVIS → 403 | `GET /ljvis/v1/permissions` | Returns 403 for TARA user not registered in LJVIS | läbis |
| 7 |  | GET /v1/permissions — shape, content and sort order | `GET /ljvis/v1/permissions` | Returns 200 | läbis |
| 8 |  | GET /v1/permissions — shape, content and sort order | `GET /ljvis/v1/permissions` | Response is an array | läbis |
| 9 |  | GET /v1/permissions — shape, content and sort order | `GET /ljvis/v1/permissions` | Exactly 79 seeded permissions (69 + xtee.query + nu.list/read/create/send + xroad.log.read + notification_template_mapping.list/edit + control_form.punishment_register + form.export) | läbis |
| 10 |  | GET /v1/permissions — shape, content and sort order | `GET /ljvis/v1/permissions` | Each permission has id, code and description | läbis |
| 11 |  | GET /v1/permissions — shape, content and sort order | `GET /ljvis/v1/permissions` | No extra fields exposed (id, code, description only) | läbis |
| 12 |  | GET /v1/permissions — shape, content and sort order | `GET /ljvis/v1/permissions` | All user_group permissions present | läbis |
| 13 |  | GET /v1/permissions — shape, content and sort order | `GET /ljvis/v1/permissions` | All user permissions present | läbis |
| 14 |  | GET /v1/permissions — shape, content and sort order | `GET /ljvis/v1/permissions` | Catalogue permissions present | läbis |
| 15 |  | GET /v1/permissions — shape, content and sort order | `GET /ljvis/v1/permissions` | Labour inspection and control form permissions present | läbis |
| 16 |  | GET /v1/permissions — shape, content and sort order | `GET /ljvis/v1/permissions` | Vehicle/trailer technical and transport interruption form permissions present | läbis |
| 17 |  | GET /v1/permissions — shape, content and sort order | `GET /ljvis/v1/permissions` | ADR form permissions present | läbis |
| 18 |  | GET /v1/permissions — shape, content and sort order | `GET /ljvis/v1/permissions` | TRAM driver form permissions present | läbis |
| 19 |  | GET /v1/permissions — shape, content and sort order | `GET /ljvis/v1/permissions` | Good repute form permissions present | läbis |
| 20 |  | GET /v1/permissions — shape, content and sort order | `GET /ljvis/v1/permissions` | Notification list/resend permissions present | läbis |
| 21 |  | GET /v1/permissions — shape, content and sort order | `GET /ljvis/v1/permissions` | Audit log permissions present | läbis |
| 22 |  | GET /v1/permissions — shape, content and sort order | `GET /ljvis/v1/permissions` | Foreign violation form and compound_form.read permissions present | läbis |
| 23 |  | GET /v1/permissions — shape, content and sort order | `GET /ljvis/v1/permissions` | Rahvastikuregister query permission present | läbis |
| 24 |  | GET /v1/permissions — shape, content and sort order | `GET /ljvis/v1/permissions` | NU (Sobimatusteade) permissions present | läbis |
| 25 |  | GET /v1/permissions — shape, content and sort order | `GET /ljvis/v1/permissions` | X-tee umbrella query permission present | läbis |
| 26 |  | GET /v1/permissions — shape, content and sort order | `GET /ljvis/v1/permissions` | Results are ordered: organisation before permission before user | läbis |

### 3. users

**Kasutajad** · testitüübid: funktsionaalne, turve, regressioon · kollektsioon `tests/postman/collections/users.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 2 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 3 |  | [Auth] Login — Local Admin | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 4 |  | [Auth] Login — Local Admin | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 5 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 6 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 7 |  | [Setup] Save org ID | `GET /ljvis/v1/organisations` | Returns 200 | läbis |
| 8 |  | [Setup] Save org ID | `GET /ljvis/v1/organisations` | Justiitsministeerium org found | läbis |
| 9 |  | [Setup] Save seeded group ID | `GET /ljvis/v1/user-groups/admin/search` | Returns 200 | läbis |
| 10 |  | GET /v1/users/admin/search — admin sees all users | `GET /ljvis/v1/users/admin/search` | Returns 200 | läbis |
| 11 |  | GET /v1/users/admin/search — admin sees all users | `GET /ljvis/v1/users/admin/search` | Response has content and total | läbis |
| 12 |  | GET /v1/users/admin/search — admin sees all users | `GET /ljvis/v1/users/admin/search` | At least 1 seeded user visible | läbis |
| 13 |  | GET /v1/users/admin/search — admin sees all users | `GET /ljvis/v1/users/admin/search` | User has required fields | läbis |
| 14 |  | GET /v1/users/admin/search — admin sees all users | `GET /ljvis/v1/users/admin/search` | userGroups is an array | läbis |
| 15 |  | GET /v1/users/admin/search — no permission → 403 | `GET /ljvis/v1/users/admin/search` | Returns 403 for user without permission | läbis |
| 16 |  | GET /v1/users/admin/search — search filter returns matching users | `GET /ljvis/v1/users/admin/search` | Returns 200 | läbis |
| 17 |  | GET /v1/users/admin/search — search filter returns matching users | `GET /ljvis/v1/users/admin/search` | Search results returned | läbis |
| 18 |  | GET /v1/users/admin/search — search filter returns matching users | `GET /ljvis/v1/users/admin/search` | All results match search term | läbis |
| 19 |  | POST /v1/users/check-personal-code-exists — existing code → 409 | `POST /ljvis/v1/users/admin/check-personal-code` | Returns 409 for existing personal code | läbis |
| 20 |  | POST /v1/users/check-personal-code-exists — unknown code → 200 empty | `POST /ljvis/v1/users/admin/check-personal-code` | Returns 200 for unused personal code | läbis |
| 21 |  | POST /v1/users/check-personal-code-exists — unknown code → 200 empty | `POST /ljvis/v1/users/admin/check-personal-code` | Result is empty array (code is available) | läbis |
| 22 |  | POST /users/insert — no permission → 403 | `POST /ljvis/v1/users/admin` | Returns 403 for user without edit permission | läbis |
| 23 |  | POST /users/insert — missing required field → 422 | `POST /ljvis/v1/users/admin` | Returns 422 when firstName is missing | läbis |
| 24 |  | POST /users/insert — success | `POST /ljvis/v1/users/admin` | Returns 200 | läbis |
| 25 |  | POST /users/insert — success | `POST /ljvis/v1/users/admin` | Response contains user id | läbis |
| 26 |  | POST /users/insert — duplicate personal code → 422 | `POST /ljvis/v1/users/admin` | Returns 422 for duplicate personal code | läbis |
| 27 |  | POST /users/insert — duplicate personal code → 422 | `POST /ljvis/v1/users/admin` | Returns VALIDATION_ERROR for personalCode field | läbis |
| 28 |  | GET /v1/users/admin — admin gets created user | `GET /ljvis/v1/users/admin` | Returns 200 | läbis |
| 29 |  | GET /v1/users/admin — admin gets created user | `GET /ljvis/v1/users/admin` | User returned | läbis |
| 30 |  | GET /v1/users/admin — admin gets created user | `GET /ljvis/v1/users/admin` | Correct user returned | läbis |
| 31 |  | GET /v1/users/admin — admin gets created user | `GET /ljvis/v1/users/admin` | User has required fields | läbis |
| 32 |  | GET /v1/users/admin/groups — empty for new user | `GET /ljvis/v1/users/admin/groups` | Returns 200 | läbis |
| 33 |  | GET /v1/users/admin/groups — empty for new user | `GET /ljvis/v1/users/admin/groups` | New user has no groups (or re-run) | läbis |
| 34 |  | PUT /v1/users/admin — update job title | `PUT /ljvis/v1/users/admin` | Returns 200 | läbis |
| 35 |  | PUT /v1/users/admin/groups — assign user to seeded group | `PUT /ljvis/v1/users/admin/groups` | Returns 200 | läbis |
| 36 |  | GET /v1/users/admin/groups — verify group assignment | `GET /ljvis/v1/users/admin/groups` | Returns 200 | läbis |
| 37 |  | GET /v1/users/admin/groups — verify group assignment | `GET /ljvis/v1/users/admin/groups` | User now belongs to one group | läbis |
| 38 |  | GET /v1/users/admin/groups — verify group assignment | `GET /ljvis/v1/users/admin/groups` | Group has userGroupId field | läbis |
| 39 |  | [Setup] Save Local Admin Group ID | `GET /ljvis/v1/user-groups/admin/search` | Returns 200 | läbis |
| 40 |  | [Setup] Save Local Admin Group ID | `GET /ljvis/v1/user-groups/admin/search` | Local Admin Group found | läbis |
| 41 |  | [Scenario] Admin creates local-admin CI user (48001011236) | `POST /ljvis/v1/users/admin` | Returns 200 | läbis |
| 42 |  | [Scenario] Admin creates local-admin CI user (48001011236) | `POST /ljvis/v1/users/admin` | Response contains user id | läbis |
| 43 |  | [Scenario] Admin assigns local-admin CI user to Local Admin Group | `PUT /ljvis/v1/users/admin/groups` | Returns 200 | läbis |
| 44 |  | [Auth] Login — Local Admin CI (48001011236) | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 45 |  | [Auth] Login — Local Admin CI (48001011236) | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 46 |  | GET /v1/users/local/search — local admin sees only JUM users | `GET /ljvis/v1/users/local/search` | Returns 200 | läbis |
| 47 |  | GET /v1/users/local/search — local admin sees only JUM users | `GET /ljvis/v1/users/local/search` | Response is array | läbis |
| 48 |  | GET /v1/users/local/search — local admin sees only JUM users | `GET /ljvis/v1/users/local/search` | Local admin sees only JUM users | läbis |
| 49 |  | POST /users/insert — local admin inserts user in own org (48001021232) | `POST /ljvis/v1/users/local` | Returns 200 | läbis |
| 50 |  | POST /users/insert — local admin inserts user in own org (48001021232) | `POST /ljvis/v1/users/local` | Response contains user id | läbis |
| 51 |  | GET /v1/users/local/search — local admin sees newly inserted user | `GET /ljvis/v1/users/local/search` | Returns 200 | läbis |
| 52 |  | GET /v1/users/local/search — local admin sees newly inserted user | `GET /ljvis/v1/users/local/search` | Response is array | läbis |
| 53 |  | GET /v1/users/local/search — local admin sees newly inserted user | `GET /ljvis/v1/users/local/search` | Newly inserted user visible to local admin | läbis |
| 54 |  | GET /v1/users/local/search — local admin sees newly inserted user | `GET /ljvis/v1/users/local/search` | List grew by one (or user already present) | läbis |

### 4. user-groups

**Kasutajagrupid** · testitüübid: funktsionaalne, turve, regressioon · kollektsioon `tests/postman/collections/user-groups.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 2 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 3 |  | [Auth] Login — Local Admin | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 4 |  | [Auth] Login — Local Admin | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 5 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 6 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 7 |  | [Setup] Save org ID | `GET /ljvis/v1/organisations` | Returns 200 | läbis |
| 8 |  | [Setup] Save org ID | `GET /ljvis/v1/organisations` | Justiitsministeerium org found | läbis |
| 9 |  | [Setup] Save permission ID | `GET /ljvis/v1/permissions` | Returns 200 | läbis |
| 10 |  | [Setup] Save seeded super admin group ID and no-group user ID | `GET /ljvis/v1/user-groups/admin/search` | Returns 200 | läbis |
| 11 |  | [Setup] Save seeded super admin group ID and no-group user ID | `GET /ljvis/v1/user-groups/admin/search` | Super Admin Group found | läbis |
| 12 |  | [Setup] Save seeded user ID (Super Admin) | `GET /ljvis/v1/users/admin/search` | Returns 200 | läbis |
| 13 |  | [Setup] Save seeded user ID (Super Admin) | `GET /ljvis/v1/users/admin/search` | Super Admin found | läbis |
| 14 |  | GET /v1/user-groups/admin/search — admin sees all groups | `GET /ljvis/v1/user-groups/admin/search` | Returns 200 | läbis |
| 15 |  | GET /v1/user-groups/admin/search — admin sees all groups | `GET /ljvis/v1/user-groups/admin/search` | Response has content and total | läbis |
| 16 |  | GET /v1/user-groups/admin/search — admin sees all groups | `GET /ljvis/v1/user-groups/admin/search` | At least 2 seeded groups visible | läbis |
| 17 |  | GET /v1/user-groups/admin/search — admin sees all groups | `GET /ljvis/v1/user-groups/admin/search` | Group has id and name | läbis |
| 18 |  | GET /v1/user-groups/admin/search — admin sees all groups | `GET /ljvis/v1/user-groups/admin/search` | Super Admin Group has at least one organisation assigned | läbis |
| 19 |  | GET /v1/user-groups/admin/search — no permission → 403 | `GET /ljvis/v1/user-groups/admin/search` | Returns 403 for user without permission | läbis |
| 20 |  | GET /v1/user-groups/admin — admin gets seeded group | `GET /ljvis/v1/user-groups/admin` | Returns 200 | läbis |
| 21 |  | GET /v1/user-groups/admin — admin gets seeded group | `GET /ljvis/v1/user-groups/admin` | Group returned | läbis |
| 22 |  | GET /v1/user-groups/admin — admin gets seeded group | `GET /ljvis/v1/user-groups/admin` | Group name is Super Admin Group | läbis |
| 23 |  | GET /v1/user-groups/admin — admin gets seeded group | `GET /ljvis/v1/user-groups/admin` | Group has id and name | läbis |
| 24 |  | GET /v1/user-groups/admin/organisations — for seeded group | `GET /ljvis/v1/user-groups/admin/organisations` | Returns 200 | läbis |
| 25 |  | GET /v1/user-groups/admin/organisations — for seeded group | `GET /ljvis/v1/user-groups/admin/organisations` | Super Admin Group has at least one organisation | läbis |
| 26 |  | GET /v1/user-groups/admin/organisations — for seeded group | `GET /ljvis/v1/user-groups/admin/organisations` | Organisation entry has name | läbis |
| 27 |  | GET /v1/user-groups/admin/permissions — for seeded group | `GET /ljvis/v1/user-groups/admin/permissions` | Returns 200 | läbis |
| 28 |  | GET /v1/user-groups/admin/permissions — for seeded group | `GET /ljvis/v1/user-groups/admin/permissions` | Super Admin Group has permissions | läbis |
| 29 |  | GET /v1/user-groups/admin/permissions — for seeded group | `GET /ljvis/v1/user-groups/admin/permissions` | Permission entry has code | läbis |
| 30 |  | GET /v1/user-groups/admin/users — for seeded group | `GET /ljvis/v1/user-groups/admin/users` | Returns 200 | läbis |
| 31 |  | GET /v1/user-groups/admin/users — for seeded group | `GET /ljvis/v1/user-groups/admin/users` | Super Admin Group has at least one member | läbis |
| 32 |  | GET /v1/user-groups/admin/users — for seeded group | `GET /ljvis/v1/user-groups/admin/users` | Member has firstName field | läbis |
| 33 |  | POST /v1/user-groups — no permission → 403 | `POST /ljvis/v1/user-groups` | Returns 403 for user without permission | läbis |
| 34 |  | POST /v1/user-groups — name too long → 422 | `POST /ljvis/v1/user-groups` | Returns 422 when group name exceeds 255 chars | läbis |
| 35 |  | POST /v1/user-groups — success | `POST /ljvis/v1/user-groups` | Returns 200 | läbis |
| 36 |  | POST /v1/user-groups — success | `POST /ljvis/v1/user-groups` | Response contains group id | läbis |
| 37 |  | POST /v1/user-groups/available-users — for created group | `POST /ljvis/v1/user-groups/available-users` | Returns 200 | läbis |
| 38 |  | POST /v1/user-groups/available-users — for created group | `POST /ljvis/v1/user-groups/available-users` | Available users: non-empty array | läbis |
| 39 |  | POST /v1/user-groups/available-users — for created group | `POST /ljvis/v1/user-groups/available-users` | Available user has required fields | läbis |
| 40 |  | PUT /v1/user-groups — rename created group | `PUT /ljvis/v1/user-groups` | Returns 200 | läbis |
| 41 |  | GET /v1/user-groups/admin — verify rename | `GET /ljvis/v1/user-groups/admin` | Returns 200 | läbis |
| 42 |  | GET /v1/user-groups/admin — verify rename | `GET /ljvis/v1/user-groups/admin` | Renamed group returned | läbis |
| 43 |  | GET /v1/user-groups/admin — verify rename | `GET /ljvis/v1/user-groups/admin` | Group name was updated to Test Group CI Updated | läbis |
| 44 |  | PUT /v1/user-groups/organisations — assign org to created group | `PUT /ljvis/v1/user-groups/organisations` | Returns 200 | läbis |
| 45 |  | GET /v1/user-groups/admin/organisations — verify org assigned | `GET /ljvis/v1/user-groups/admin/organisations` | Returns 200 | läbis |
| 46 |  | GET /v1/user-groups/admin/organisations — verify org assigned | `GET /ljvis/v1/user-groups/admin/organisations` | Organisation was assigned — list is non-empty | läbis |
| 47 |  | GET /v1/user-groups/admin/organisations — verify org assigned | `GET /ljvis/v1/user-groups/admin/organisations` | Assigned organisation is Justiitsministeerium | läbis |
| 48 |  | PUT /v1/user-groups/permissions — add permission to created group | `PUT /ljvis/v1/user-groups/permissions` | Returns 200 | läbis |
| 49 |  | GET /v1/user-groups/admin/permissions — verify permission added | `GET /ljvis/v1/user-groups/admin/permissions` | Returns 200 | läbis |
| 50 |  | GET /v1/user-groups/admin/permissions — verify permission added | `GET /ljvis/v1/user-groups/admin/permissions` | Permission was added — list is non-empty | läbis |
| 51 |  | GET /v1/user-groups/admin/permissions — verify permission added | `GET /ljvis/v1/user-groups/admin/permissions` | Permission user_group.update is present in group | läbis |
| 52 |  | PUT /v1/user-groups/users — add seeded user to created group | `PUT /ljvis/v1/user-groups/users` | Returns 200 | läbis |
| 53 |  | GET /v1/user-groups/admin/users — verify member added | `GET /ljvis/v1/user-groups/admin/users` | Returns 200 | läbis |
| 54 |  | GET /v1/user-groups/admin/users — verify member added | `GET /ljvis/v1/user-groups/admin/users` | Created user is a member of the group | läbis |
| 55 |  | GET /v1/user-groups/admin/users — verify member added | `GET /ljvis/v1/user-groups/admin/users` | Member has personalCode 60001019906 | läbis |
| 56 |  | POST /v1/user-groups/users/user — remove user from group | `POST /ljvis/v1/user-groups/users/user` | Returns 200 | läbis |
| 57 |  | GET /v1/user-groups/admin/users — verify member removed | `GET /ljvis/v1/user-groups/admin/users` | Returns 200 | läbis |
| 58 |  | GET /v1/user-groups/admin/users — verify member removed | `GET /ljvis/v1/user-groups/admin/users` | Group is empty after removing member | läbis |

### 5. classifiers

**Klassifikaatorid** · testitüübid: funktsionaalne, turve, regressioon · kollektsioon `tests/postman/collections/classifiers.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 2 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 3 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 4 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 5 |  | [Setup] Save classifier IDs | `GET /ljvis/v1/classifiers` | Setup: classifier list returns 200 | läbis |
| 6 |  | [Setup] Save classifier IDs | `GET /ljvis/v1/classifiers` | Setup: at least 2 classifiers seeded | läbis |
| 7 |  | [Setup] Save classifier IDs | `GET /ljvis/v1/classifiers` | Setup: RTK classifier present | läbis |
| 8 |  | [Setup] Save classifier IDs | `GET /ljvis/v1/classifiers` | Setup: TEST classifier present | läbis |
| 9 |  | [Setup] Save classifier IDs | `GET /ljvis/v1/classifiers` | Setup: ADR_CONTROL_CHECKPOINT classifier present (#229) | läbis |
| 10 |  | [Setup] Save classifier IDs | `GET /ljvis/v1/classifiers` | Setup: ADR_QUANTITY_UNIT classifier present (#230) | läbis |
| 11 |  | [Setup] Save classifier IDs | `GET /ljvis/v1/classifiers` | Setup: DANGEROUS_GOODS_INFRINGEMENTS_NEW eemaldatud (#231) | läbis |
| 12 |  | [Setup] Save seeded value ID (RTK/EE) | `GET /ljvis/v1/classifiers/values` | Setup: values list returns 200 | läbis |
| 13 |  | [Setup] Save seeded value ID (RTK/EE) | `GET /ljvis/v1/classifiers/values` | Setup: EE value present in RTK | läbis |
| 14 |  | GET /v1/classifiers — no permission → 403 | `GET /ljvis/v1/classifiers` | Returns 403 without permission | läbis |
| 15 |  | GET /v1/classifiers — list shape, total and sort order | `GET /ljvis/v1/classifiers` | Returns 200 | läbis |
| 16 |  | GET /v1/classifiers — list shape, total and sort order | `GET /ljvis/v1/classifiers` | Body has content array and total | läbis |
| 17 |  | GET /v1/classifiers — list shape, total and sort order | `GET /ljvis/v1/classifiers` | Total equals 64 (production Liquibase migrations incl. NU_MESSAGE_STATUS/NU_MEMBER_STATE_STATUS/LABOUR_INSPECTION_VIOLATION/RSI_FAILED_REASON + 1 CI-only TEST classifier) | läbis |
| 18 |  | GET /v1/classifiers — list shape, total and sort order | `GET /ljvis/v1/classifiers` | Each item has id, code, name, description | läbis |
| 19 |  | GET /v1/classifiers — list shape, total and sort order | `GET /ljvis/v1/classifiers` | Sorted name asc — RTK before TEST | läbis |
| 20 |  | GET /v1/classifiers — search by code 'RTK' → 1 result | `GET /ljvis/v1/classifiers` | Returns 200 | läbis |
| 21 |  | GET /v1/classifiers — search by code 'RTK' → 1 result | `GET /ljvis/v1/classifiers` | Exactly 1 result for RTK code | läbis |
| 22 |  | GET /v1/classifiers — search by code 'RTK' → 1 result | `GET /ljvis/v1/classifiers` | Result code is RTK | läbis |
| 23 |  | GET /v1/classifiers — search by name 'Riikide' (triggers audit log) | `GET /ljvis/v1/classifiers` | Returns 200 | läbis |
| 24 |  | GET /v1/classifiers — search by name 'Riikide' (triggers audit log) | `GET /ljvis/v1/classifiers` | At least 1 result for name search | läbis |
| 25 |  | GET /v1/classifiers — search by name 'Riikide' (triggers audit log) | `GET /ljvis/v1/classifiers` | RTK classifier found by name | läbis |
| 26 |  | GET /v1/classifiers — sort code asc → RTK before TEST | `GET /ljvis/v1/classifiers` | Returns 200 | läbis |
| 27 |  | GET /v1/classifiers — sort code asc → RTK before TEST | `GET /ljvis/v1/classifiers` | Sorted code asc: RTK before TEST | läbis |
| 28 |  | GET /v1/classifiers — sort code desc → TEST before RTK | `GET /ljvis/v1/classifiers` | Returns 200 | läbis |
| 29 |  | GET /v1/classifiers — sort code desc → TEST before RTK | `GET /ljvis/v1/classifiers` | Sorted code desc: TEST before RTK | läbis |
| 30 |  | GET /v1/classifiers — pagination pageSize=1 returns 1 item, total=59 | `GET /ljvis/v1/classifiers` | Returns 200 | läbis |
| 31 |  | GET /v1/classifiers — pagination pageSize=1 returns 1 item, total=59 | `GET /ljvis/v1/classifiers` | Page 1 has exactly 1 item | läbis |
| 32 |  | GET /v1/classifiers — pagination pageSize=1 returns 1 item, total=59 | `GET /ljvis/v1/classifiers` | Total is still 64 | läbis |
| 33 |  | GET /v1/classifiers/classifier — no permission → 403 | `GET /ljvis/v1/classifiers/classifier` | Returns 403 without permission | läbis |
| 34 |  | GET /v1/classifiers/classifier — get RTK by id | `GET /ljvis/v1/classifiers/classifier` | Returns 200 | läbis |
| 35 |  | GET /v1/classifiers/classifier — get RTK by id | `GET /ljvis/v1/classifiers/classifier` | Returns RTK classifier | läbis |
| 36 |  | GET /v1/classifiers/classifier — get RTK by id | `GET /ljvis/v1/classifiers/classifier` | Has name field | läbis |
| 37 |  | GET /v1/classifiers/values — no permission → 403 | `GET /ljvis/v1/classifiers/values` | Returns 403 without permission | läbis |
| 38 |  | GET /v1/classifiers/values — RTK has 28 values (27 valid + 1 expired) | `GET /ljvis/v1/classifiers/values` | Returns 200 | läbis |
| 39 |  | GET /v1/classifiers/values — RTK has 28 values (27 valid + 1 expired) | `GET /ljvis/v1/classifiers/values` | Response has content array | läbis |
| 40 |  | GET /v1/classifiers/values — RTK has 28 values (27 valid + 1 expired) | `GET /ljvis/v1/classifiers/values` | Total equals 28 (27 EL liikmesriiki + 1 aegunud XX testtunnus) | läbis |
| 41 |  | GET /v1/classifiers/values — RTK has 28 values (27 valid + 1 expired) | `GET /ljvis/v1/classifiers/values` | Each value has classifierValueId, code, name, isValid, classifierId | läbis |
| 42 |  | GET /v1/classifiers/values — RTK has 28 values (27 valid + 1 expired) | `GET /ljvis/v1/classifiers/values` | 27 valid and 1 expired value | läbis |
| 43 |  | GET /v1/classifiers/values — default sort: valid values first (isValid desc) | `GET /ljvis/v1/classifiers/values` | Returns 200 | läbis |
| 44 |  | GET /v1/classifiers/values — default sort: valid values first (isValid desc) | `GET /ljvis/v1/classifiers/values` | First item is valid (isValid desc default sort) | läbis |
| 45 |  | GET /v1/classifiers/values — default sort: valid values first (isValid desc) | `GET /ljvis/v1/classifiers/values` | Last item is expired | läbis |
| 46 |  | GET /v1/classifiers/values — search 'Eesti' → 1 result (EE) | `GET /ljvis/v1/classifiers/values` | Returns 200 | läbis |
| 47 |  | GET /v1/classifiers/values — search 'Eesti' → 1 result (EE) | `GET /ljvis/v1/classifiers/values` | Exactly 1 result for Eesti | läbis |
| 48 |  | GET /v1/classifiers/values — search 'Eesti' → 1 result (EE) | `GET /ljvis/v1/classifiers/values` | Result code is EE | läbis |
| 49 |  | GET /v1/classifiers/values — sort code asc → AT first | `GET /ljvis/v1/classifiers/values` | Returns 200 | läbis |
| 50 |  | GET /v1/classifiers/values — sort code asc → AT first | `GET /ljvis/v1/classifiers/values` | First value code is AT (code asc, Austria is first EU member alphabetically) | läbis |
| 51 |  | GET /v1/classifiers/values — pagination pageSize=2 returns 2 items, total=28 | `GET /ljvis/v1/classifiers/values` | Returns 200 | läbis |
| 52 |  | GET /v1/classifiers/values — pagination pageSize=2 returns 2 items, total=28 | `GET /ljvis/v1/classifiers/values` | Page has exactly 2 items | läbis |
| 53 |  | GET /v1/classifiers/values — pagination pageSize=2 returns 2 items, total=28 | `GET /ljvis/v1/classifiers/values` | Total is still 28 | läbis |
| 54 |  | GET /v1/classifiers/values — ADR_CONTROL_CHECKPOINT has 43 values (16 punkti + 27 rikkumisliiki) (#229) | `GET /ljvis/v1/classifiers/values` | Returns 200 | läbis |
| 55 |  | GET /v1/classifiers/values — ADR_CONTROL_CHECKPOINT has 43 values (16 punkti + 27 rikkumisliiki) (#229) | `GET /ljvis/v1/classifiers/values` | Total equals 43 (16 kontrollkaardi punkti + 27 seotud 2016/403 rikkumisliiki) | läbis |
| 56 |  | GET /v1/classifiers/values — ADR_CONTROL_CHECKPOINT has 43 values (16 punkti + 27 rikkumisliiki) (#229) | `GET /ljvis/v1/classifiers/values` | Tase 1: punktid P12..P27 olemas | läbis |
| 57 |  | GET /v1/classifiers/values — ADR_CONTROL_CHECKPOINT has 43 values (16 punkti + 27 rikkumisliiki) (#229) | `GET /ljvis/v1/classifiers/values` | Tase 2: sama rikkumisliik mitme punkti all eraldi kirjena | läbis |
| 58 |  | GET /v1/classifiers/values — ADR_CONTROL_CHECKPOINT has 43 values (16 punkti + 27 rikkumisliiki) (#229) | `GET /ljvis/v1/classifiers/values` | Tase 2 nimi algab ametliku rikkumise koodiga (MSI/VSI/SI nnn) | läbis |
| 59 |  | GET /v1/classifiers/values — ADR_QUANTITY_UNIT has 8 units (#230) | `GET /ljvis/v1/classifiers/values` | Returns 200 | läbis |
| 60 |  | GET /v1/classifiers/values — ADR_QUANTITY_UNIT has 8 units (#230) | `GET /ljvis/v1/classifiers/values` | Total equals 8 | läbis |
| 61 |  | GET /v1/classifiers/values — ADR_QUANTITY_UNIT has 8 units (#230) | `GET /ljvis/v1/classifiers/values` | Ühikute koodid õiged | läbis |
| 62 |  | GET /v1/classifiers/values — ADR_QUANTITY_UNIT has 8 units (#230) | `GET /ljvis/v1/classifiers/values` | m3 kuvasilt on m³ | läbis |
| 63 |  | GET /v1/classifiers/value — no permission → 403 | `GET /ljvis/v1/classifiers/value` | Returns 403 without permission | läbis |
| 64 |  | GET /v1/classifiers/value — get single RTK/EE value | `GET /ljvis/v1/classifiers/value` | Returns 200 | läbis |
| 65 |  | GET /v1/classifiers/value — get single RTK/EE value | `GET /ljvis/v1/classifiers/value` | Code is EE | läbis |
| 66 |  | GET /v1/classifiers/value — get single RTK/EE value | `GET /ljvis/v1/classifiers/value` | Has classifierId and classifierValueId | läbis |
| 67 |  | GET /v1/classifiers/value — get single RTK/EE value | `GET /ljvis/v1/classifiers/value` | Has validFrom | läbis |
| 68 |  | PUT /v1/classifiers — no permission → 403 | `PUT /ljvis/v1/classifiers` | Returns 403 without permission | läbis |
| 69 |  | PUT /v1/classifiers — empty name → 422 | `PUT /ljvis/v1/classifiers` | Returns 422 for empty name | läbis |
| 70 |  | PUT /v1/classifiers — update TEST description → 200, verify change | `PUT /ljvis/v1/classifiers` | Returns 200 | läbis |
| 71 |  | GET /v1/classifiers/classifier — verify description updated | `GET /ljvis/v1/classifiers/classifier` | Returns 200 | läbis |
| 72 |  | GET /v1/classifiers/classifier — verify description updated | `GET /ljvis/v1/classifiers/classifier` | Description was updated by CI test | läbis |
| 73 |  | GET /v1/classifiers/classifier — verify description updated | `GET /ljvis/v1/classifiers/classifier` | Name is still Test Classifier | läbis |
| 74 |  | POST /v1/classifiers/value — no permission → 403 | `POST /ljvis/v1/classifiers/value` | Returns 403 without permission | läbis |
| 75 |  | POST /v1/classifiers/value — create TEST_CI value under RTK → 200 | `POST /ljvis/v1/classifiers/value` | Returns 200 | läbis |
| 76 |  | POST /v1/classifiers/value — create TEST_CI value under RTK → 200 | `POST /ljvis/v1/classifiers/value` | Response contains new value id | läbis |
| 77 |  | PUT /v1/classifiers/value — no permission → 403 | `PUT /ljvis/v1/classifiers/value` | Returns 403 without permission | läbis |
| 78 |  | PUT /v1/classifiers/value — update TEST_CI validity → 200 | `PUT /ljvis/v1/classifiers/value` | Returns 200 | läbis |

### 6. compound-form

**Koondvorm** · testitüübid: funktsionaalne, regressioon, turve · kollektsioon `tests/postman/collections/compound-form.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 2 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 3 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 4 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 5 |  | POST compound-form/edit/save — no permission → 403 | `POST /ljvis/v1/control-forms/compound-form/edit/save` | 403 without compound_form.write | läbis |
| 6 |  | POST compound-form/edit/save — create (happy path) → 200, koond- number, version 1 | `POST /ljvis/v1/control-forms/compound-form/edit/save` | Returns 200 | läbis |
| 7 |  | POST compound-form/edit/save — create (happy path) → 200, koond- number, version 1 | `POST /ljvis/v1/control-forms/compound-form/edit/save` | id present | läbis |
| 8 |  | POST compound-form/edit/save — create (happy path) → 200, koond- number, version 1 | `POST /ljvis/v1/control-forms/compound-form/edit/save` | form number has koond- prefix | läbis |
| 9 |  | POST compound-form/edit/save — create (happy path) → 200, koond- number, version 1 | `POST /ljvis/v1/control-forms/compound-form/edit/save` | version is 1 | läbis |
| 10 |  | GET compound-form?q= → 200, status saved | `GET /ljvis/v1/control-forms/compound-form` | Returns 200 | läbis |
| 11 |  | GET compound-form?q= → 200, status saved | `GET /ljvis/v1/control-forms/compound-form` | status is saved | läbis |
| 12 |  | GET compound-form?q= → 200, status saved | `GET /ljvis/v1/control-forms/compound-form` | vehicleRegNr matches | läbis |
| 13 |  | GET compound-form?q= → 200, status saved | `GET /ljvis/v1/control-forms/compound-form` | address matches | läbis |
| 14 |  | POST compound-form/edit/save — re-save while saved → version stays 1 | `POST /ljvis/v1/control-forms/compound-form/edit/save` | Returns 200 | läbis |
| 15 |  | POST compound-form/edit/save — re-save while saved → version stays 1 | `POST /ljvis/v1/control-forms/compound-form/edit/save` | version stays 1 (saved-state resave rule) | läbis |
| 16 |  | POST compound-form/edit/confirm — happy path (saved -&gt; confirmed) → 200, version unchanged | `POST /ljvis/v1/control-forms/compound-form/edit/confirm` | Returns 200 | läbis |
| 17 |  | POST compound-form/edit/confirm — happy path (saved -&gt; confirmed) → 200, version unchanged | `POST /ljvis/v1/control-forms/compound-form/edit/confirm` | version unchanged by confirm | läbis |
| 18 |  | POST compound-form/edit/save — admin re-saves confirmed form → 200, version bumps to 2 | `POST /ljvis/v1/control-forms/compound-form/edit/save` | Returns 200 | läbis |
| 19 |  | POST compound-form/edit/save — admin re-saves confirmed form → 200, version bumps to 2 | `POST /ljvis/v1/control-forms/compound-form/edit/save` | version bumps to 2 (edit_locked re-save of confirmed form) | läbis |
| 20 |  | POST compound-form/edit/publish — happy path (confirmed -&gt; published) → 200, version unchanged | `POST /ljvis/v1/control-forms/compound-form/edit/publish` | Returns 200 | läbis |
| 21 |  | POST compound-form/edit/publish — happy path (confirmed -&gt; published) → 200, version unchanged | `POST /ljvis/v1/control-forms/compound-form/edit/publish` | version unchanged by publish | läbis |
| 22 |  | POST compound-form/edit/save — admin re-saves published form → 200, status published, version bumps to 3, new data persisted | `POST /ljvis/v1/control-forms/compound-form/edit/save` | Returns 200 | läbis |
| 23 |  | POST compound-form/edit/save — admin re-saves published form → 200, status published, version bumps to 3, new data persisted | `POST /ljvis/v1/control-forms/compound-form/edit/save` | version bumps to 3 (edit_locked re-save of published form) | läbis |
| 24 |  | GET compound-form?q= after published resave → status published, new data persisted | `GET /ljvis/v1/control-forms/compound-form` | Returns 200 | läbis |
| 25 |  | GET compound-form?q= after published resave → status published, new data persisted | `GET /ljvis/v1/control-forms/compound-form` | status is still published (regression: was being saved with old data) | läbis |
| 26 |  | GET compound-form?q= after published resave → status published, new data persisted | `GET /ljvis/v1/control-forms/compound-form` | address updated to new value (regression: was returning old data) | läbis |
| 27 |  | GET compound-form?q= after published resave → status published, new data persisted | `GET /ljvis/v1/control-forms/compound-form` | vehicleModel updated to new value | läbis |

### 7. driverest-forms

**Sõidu- ja puhkeaja vormid (juht, meeskonnaliige)** · testitüübid: funktsionaalne, regressioon, integratsioon · kollektsioon `tests/postman/collections/driverest-forms.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 2 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 3 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 4 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 5 |  | [Setup] Create compound form for drive-rest sub-form tests | `POST /ljvis/v1/control-forms/compound-form/edit/save` | Returns 200 | läbis |
| 6 |  | [Setup] Create compound form for drive-rest sub-form tests | `POST /ljvis/v1/control-forms/compound-form/edit/save` | id present | läbis |
| 7 |  | POST drive-rest-form/driver/edit/save — no permission → 403 | `POST /ljvis/v1/control-forms/drive-rest-form/driver/edit/save` | Returns 403 without sp_driver_form.write | läbis |
| 8 |  | POST drive-rest-form/driver/edit/save — missing compoundFormKey → 422 required | `POST /ljvis/v1/control-forms/drive-rest-form/driver/edit/save` | Returns 422 | läbis |
| 9 |  | POST drive-rest-form/driver/edit/save — missing compoundFormKey → 422 required | `POST /ljvis/v1/control-forms/drive-rest-form/driver/edit/save` | field is compoundFormKey | läbis |
| 10 |  | POST drive-rest-form/driver/edit/save — missing compoundFormKey → 422 required | `POST /ljvis/v1/control-forms/drive-rest-form/driver/edit/save` | code is required | läbis |
| 11 |  | POST drive-rest-form/driver/edit/save — create → 200, save id/subFormNumber, version=1 | `POST /ljvis/v1/control-forms/drive-rest-form/driver/edit/save` | Returns 200 | läbis |
| 12 |  | POST drive-rest-form/driver/edit/save — create → 200, save id/subFormNumber, version=1 | `POST /ljvis/v1/control-forms/drive-rest-form/driver/edit/save` | Response has id, subFormNumber, version=1 | läbis |
| 13 |  | GET driver-form — no permission → 403 | `GET /ljvis/v1/control-forms/driver-form` | Returns 403 without sp_driver_form.read | läbis |
| 14 |  | GET driver-form — not found → 404 | `GET /ljvis/v1/control-forms/driver-form` | Returns 404 for nonexistent id | läbis |
| 15 |  | GET driver-form — happy path, verify fields | `GET /ljvis/v1/control-forms/driver-form` | Returns 200 | läbis |
| 16 |  | GET driver-form — happy path, verify fields | `GET /ljvis/v1/control-forms/driver-form` | status is saved | läbis |
| 17 |  | GET driver-form — happy path, verify fields | `GET /ljvis/v1/control-forms/driver-form` | notes match | läbis |
| 18 |  | GET driver-form — happy path, verify fields | `GET /ljvis/v1/control-forms/driver-form` | subFormNumber matches | läbis |
| 19 |  | GET driver-form — happy path, verify fields | `GET /ljvis/v1/control-forms/driver-form` | compoundFormKey matches | läbis |
| 20 |  | POST drive-rest-form/driver/edit/save — re-save while saved → 200, version stays 1 | `POST /ljvis/v1/control-forms/drive-rest-form/driver/edit/save` | Returns 200 | läbis |
| 21 |  | POST drive-rest-form/driver/edit/save — re-save while saved → 200, version stays 1 | `POST /ljvis/v1/control-forms/drive-rest-form/driver/edit/save` | subFormNumber unchanged | läbis |
| 22 |  | GET sp-driver/read/get-by-compound-form-key — happy path, returns driver form | `GET /ljvis/v1/control-forms/sp-driver/read/get-by-compound-form-key` | Returns 200 | läbis |
| 23 |  | GET sp-driver/read/get-by-compound-form-key — happy path, returns driver form | `GET /ljvis/v1/control-forms/sp-driver/read/get-by-compound-form-key` | driver form found for compound key | läbis |
| 24 |  | POST drive-rest-form/driver/edit/confirm — no permission → 403 | `POST /ljvis/v1/control-forms/drive-rest-form/driver/edit/confirm` | Returns 403 without sp_driver_form.write | läbis |
| 25 |  | POST drive-rest-form/driver/edit/confirm — happy path → 200, status confirmed | `POST /ljvis/v1/control-forms/drive-rest-form/driver/edit/confirm` | Returns 200 | läbis |
| 26 |  | GET driver-form — status is confirmed after confirm | `GET /ljvis/v1/control-forms/driver-form` | Returns 200 | läbis |
| 27 |  | GET driver-form — status is confirmed after confirm | `GET /ljvis/v1/control-forms/driver-form` | status is confirmed | läbis |
| 28 |  | POST drive-rest-form/driver/edit/confirm — already confirmed → 422 already_confirmed | `POST /ljvis/v1/control-forms/drive-rest-form/driver/edit/confirm` | Returns 422 | läbis |
| 29 |  | POST drive-rest-form/driver/edit/confirm — already confirmed → 422 already_confirmed | `POST /ljvis/v1/control-forms/drive-rest-form/driver/edit/confirm` | code is already_confirmed | läbis |
| 30 |  | POST drive-rest-form/driver/edit/delete — no permission → 403 | `POST /ljvis/v1/control-forms/drive-rest-form/driver/edit/delete` | Returns 403 without sp_driver_form.write | läbis |
| 31 |  | POST drive-rest-form/driver/edit/delete — happy path → 200 | `POST /ljvis/v1/control-forms/drive-rest-form/driver/edit/delete` | Returns 200 | läbis |
| 32 |  | GET driver-form — deleted form still readable, status=deleted | `GET /ljvis/v1/control-forms/driver-form` | Returns 200 | läbis |
| 33 |  | GET driver-form — deleted form still readable, status=deleted | `GET /ljvis/v1/control-forms/driver-form` | status is deleted | läbis |
| 34 |  | POST drive-rest-form/teammate/edit/save — no permission → 403 | `POST /ljvis/v1/control-forms/drive-rest-form/teammate/edit/save` | Returns 403 without sp_teammate_form.write | läbis |
| 35 |  | POST drive-rest-form/teammate/edit/save — missing compoundFormKey → 422 required | `POST /ljvis/v1/control-forms/drive-rest-form/teammate/edit/save` | Returns 422 | läbis |
| 36 |  | POST drive-rest-form/teammate/edit/save — missing compoundFormKey → 422 required | `POST /ljvis/v1/control-forms/drive-rest-form/teammate/edit/save` | field is compoundFormKey | läbis |
| 37 |  | POST drive-rest-form/teammate/edit/save — missing compoundFormKey → 422 required | `POST /ljvis/v1/control-forms/drive-rest-form/teammate/edit/save` | code is required | läbis |
| 38 |  | POST drive-rest-form/teammate/edit/save — create → 200, save id/subFormNumber, version=1 | `POST /ljvis/v1/control-forms/drive-rest-form/teammate/edit/save` | Returns 200 | läbis |
| 39 |  | POST drive-rest-form/teammate/edit/save — create → 200, save id/subFormNumber, version=1 | `POST /ljvis/v1/control-forms/drive-rest-form/teammate/edit/save` | Response has id, subFormNumber, version=1 | läbis |
| 40 |  | GET teammate-form — no permission → 403 | `GET /ljvis/v1/control-forms/teammate-form` | Returns 403 without sp_teammate_form.read | läbis |
| 41 |  | GET teammate-form — not found → 404 | `GET /ljvis/v1/control-forms/teammate-form` | Returns 404 for nonexistent id | läbis |
| 42 |  | GET teammate-form — happy path, verify fields | `GET /ljvis/v1/control-forms/teammate-form` | Returns 200 | läbis |
| 43 |  | GET teammate-form — happy path, verify fields | `GET /ljvis/v1/control-forms/teammate-form` | status is saved | läbis |
| 44 |  | GET teammate-form — happy path, verify fields | `GET /ljvis/v1/control-forms/teammate-form` | notes match | läbis |
| 45 |  | GET teammate-form — happy path, verify fields | `GET /ljvis/v1/control-forms/teammate-form` | subFormNumber matches | läbis |
| 46 |  | GET teammate-form — happy path, verify fields | `GET /ljvis/v1/control-forms/teammate-form` | compoundFormKey matches | läbis |
| 47 |  | POST drive-rest-form/teammate/edit/save — re-save while saved → 200, version stays 1 | `POST /ljvis/v1/control-forms/drive-rest-form/teammate/edit/save` | Returns 200 | läbis |
| 48 |  | POST drive-rest-form/teammate/edit/save — re-save while saved → 200, version stays 1 | `POST /ljvis/v1/control-forms/drive-rest-form/teammate/edit/save` | subFormNumber unchanged | läbis |
| 49 |  | GET sp-teammate/read/get-by-compound-form-key — happy path, returns teammate form | `GET /ljvis/v1/control-forms/sp-teammate/read/get-by-compound-form-key` | Returns 200 | läbis |
| 50 |  | GET sp-teammate/read/get-by-compound-form-key — happy path, returns teammate form | `GET /ljvis/v1/control-forms/sp-teammate/read/get-by-compound-form-key` | teammate form found for compound key | läbis |
| 51 |  | POST drive-rest-form/teammate/edit/confirm — no permission → 403 | `POST /ljvis/v1/control-forms/drive-rest-form/teammate/edit/confirm` | Returns 403 without sp_teammate_form.write | läbis |
| 52 |  | POST drive-rest-form/teammate/edit/confirm — happy path → 200, status confirmed | `POST /ljvis/v1/control-forms/drive-rest-form/teammate/edit/confirm` | Returns 200 | läbis |
| 53 |  | GET teammate-form — status is confirmed after confirm | `GET /ljvis/v1/control-forms/teammate-form` | Returns 200 | läbis |
| 54 |  | GET teammate-form — status is confirmed after confirm | `GET /ljvis/v1/control-forms/teammate-form` | status is confirmed | läbis |
| 55 |  | POST drive-rest-form/teammate/edit/confirm — already confirmed → 422 already_confirmed | `POST /ljvis/v1/control-forms/drive-rest-form/teammate/edit/confirm` | Returns 422 | läbis |
| 56 |  | POST drive-rest-form/teammate/edit/confirm — already confirmed → 422 already_confirmed | `POST /ljvis/v1/control-forms/drive-rest-form/teammate/edit/confirm` | code is already_confirmed | läbis |
| 57 |  | POST drive-rest-form/teammate/edit/delete — no permission → 403 | `POST /ljvis/v1/control-forms/drive-rest-form/teammate/edit/delete` | Returns 403 without sp_teammate_form.write | läbis |
| 58 |  | POST drive-rest-form/teammate/edit/delete — happy path → 200 | `POST /ljvis/v1/control-forms/drive-rest-form/teammate/edit/delete` | Returns 200 | läbis |
| 59 |  | GET teammate-form — deleted form still readable, status=deleted | `GET /ljvis/v1/control-forms/teammate-form` | Returns 200 | läbis |
| 60 |  | GET teammate-form — deleted form still readable, status=deleted | `GET /ljvis/v1/control-forms/teammate-form` | status is deleted | läbis |

### 8. tram-control-card

**Transpordiameti kontrollkaart (TRAM)** · testitüübid: funktsionaalne, regressioon · kollektsioon `tests/postman/collections/tram-control-card.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | 200 | läbis |
| 2 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | 200 | läbis |
| 3 |  | edit/save — no permission -&gt; 403 | `POST /ljvis/v1/control-forms/tram-card/edit/save` | 403 | läbis |
| 4 |  | edit/save — create -&gt; 200, tram- number, version 1, saved | `POST /ljvis/v1/control-forms/tram-card/edit/save` | 200 | läbis |
| 5 |  | edit/save — create -&gt; 200, tram- number, version 1, saved | `POST /ljvis/v1/control-forms/tram-card/edit/save` | id is number | läbis |
| 6 |  | edit/save — create -&gt; 200, tram- number, version 1, saved | `POST /ljvis/v1/control-forms/tram-card/edit/save` | tram- number | läbis |
| 7 |  | edit/save — create -&gt; 200, tram- number, version 1, saved | `POST /ljvis/v1/control-forms/tram-card/edit/save` | version 1 | läbis |
| 8 |  | edit/save — re-save keeps version 1 | `POST /ljvis/v1/control-forms/tram-card/edit/save` | 200 | läbis |
| 9 |  | edit/save — re-save keeps version 1 | `POST /ljvis/v1/control-forms/tram-card/edit/save` | version still 1 | läbis |
| 10 |  | GET get — status saved | `GET /ljvis/v1/control-forms/tram-card/get` | 200 | läbis |
| 11 |  | GET get — status saved | `GET /ljvis/v1/control-forms/tram-card/get` | status saved | läbis |
| 12 |  | edit/publish from saved -&gt; 422 not_confirmed | `POST /ljvis/v1/control-forms/tram-card/edit/publish` | 422 | läbis |
| 13 |  | edit/publish from saved -&gt; 422 not_confirmed | `POST /ljvis/v1/control-forms/tram-card/edit/publish` | not_confirmed | läbis |
| 14 |  | edit/confirm -&gt; 200 confirmed | `POST /ljvis/v1/control-forms/tram-card/edit/confirm` | 200 | läbis |
| 15 |  | edit/confirm -&gt; 200 confirmed | `POST /ljvis/v1/control-forms/tram-card/edit/confirm` | confirmed | läbis |
| 16 |  | edit/confirm again -&gt; 422 already_confirmed | `POST /ljvis/v1/control-forms/tram-card/edit/confirm` | 422 | läbis |
| 17 |  | edit/confirm again -&gt; 422 already_confirmed | `POST /ljvis/v1/control-forms/tram-card/edit/confirm` | already_confirmed | läbis |
| 18 |  | edit/publish -&gt; 200 published, version 2 | `POST /ljvis/v1/control-forms/tram-card/edit/publish` | 200 | läbis |
| 19 |  | edit/publish -&gt; 200 published, version 2 | `POST /ljvis/v1/control-forms/tram-card/edit/publish` | published | läbis |
| 20 |  | edit/publish -&gt; 200 published, version 2 | `POST /ljvis/v1/control-forms/tram-card/edit/publish` | version 2 | läbis |
| 21 |  | edit/publish again -&gt; 422 already_published | `POST /ljvis/v1/control-forms/tram-card/edit/publish` | 422 | läbis |
| 22 |  | edit/publish again -&gt; 422 already_published | `POST /ljvis/v1/control-forms/tram-card/edit/publish` | already_published | läbis |
| 23 |  | GET get-snapshots — ordered history | `GET /ljvis/v1/control-forms/tram-card/get-snapshots` | 200 | läbis |
| 24 |  | GET get-snapshots — ordered history | `GET /ljvis/v1/control-forms/tram-card/get-snapshots` | has &gt;=3 snapshots | läbis |
| 25 |  | GET get-snapshots — ordered history | `GET /ljvis/v1/control-forms/tram-card/get-snapshots` | last is published | läbis |
| 26 |  | edit/save — driverNotApplicable, no driver name -&gt; 200 | `POST /ljvis/v1/control-forms/tram-card/edit/save` | 200 | läbis |
| 27 |  | edit/confirm — driverNotApplicable card -&gt; 200 | `POST /ljvis/v1/control-forms/tram-card/edit/confirm` | 200 | läbis |
| 28 |  | edit/save — future controlDate -&gt; 422 | `POST /ljvis/v1/control-forms/tram-card/edit/save` | 422 | läbis |
| 29 |  | edit/save — future controlDate -&gt; 422 | `POST /ljvis/v1/control-forms/tram-card/edit/save` | future_date | läbis |
| 30 |  | [e-toimik] Setup — create + confirm a proceeding card | `POST /ljvis/v1/control-forms/tram-card/edit/save` | 200 | läbis |
| 31 |  | [e-toimik] confirm the proceeding card | `POST /ljvis/v1/control-forms/tram-card/edit/confirm` | 200 | läbis |
| 32 |  | [e-toimik] select_etoimik_candidates includes the confirmed card | `POST /ljvis/control-forms/tram-card/select_etoimik_candidates` | 200 | läbis |
| 33 |  | [e-toimik] select_etoimik_candidates includes the confirmed card | `POST /ljvis/control-forms/tram-card/select_etoimik_candidates` | candidate present | läbis |
| 34 |  | [e-toimik] apply_etoimik_decision found=true -&gt; published v2, created_by e-toimik | `POST /ljvis/control-forms/tram-card/apply_etoimik_decision` | 200 | läbis |
| 35 |  | [e-toimik] apply_etoimik_decision found=true -&gt; published v2, created_by e-toimik | `POST /ljvis/control-forms/tram-card/apply_etoimik_decision` | published | läbis |
| 36 |  | [e-toimik] card now shows enforcement_decision + published, created_by e-toimik | `GET /ljvis/v1/control-forms/tram-card/get` | 200 | läbis |
| 37 |  | [e-toimik] card now shows enforcement_decision + published, created_by e-toimik | `GET /ljvis/v1/control-forms/tram-card/get` | published | läbis |
| 38 |  | [e-toimik] card now shows enforcement_decision + published, created_by e-toimik | `GET /ljvis/v1/control-forms/tram-card/get` | enforcementDecision set | läbis |
| 39 |  | [e-toimik] card now shows enforcement_decision + published, created_by e-toimik | `GET /ljvis/v1/control-forms/tram-card/get` | created_by e-toimik | läbis |
| 40 |  | [e-toimik] candidates no longer include the resolved card (idempotent) | `POST /ljvis/control-forms/tram-card/select_etoimik_candidates` | 200 | läbis |
| 41 |  | [e-toimik] candidates no longer include the resolved card (idempotent) | `POST /ljvis/control-forms/tram-card/select_etoimik_candidates` | gone | läbis |
| 42 |  | [e-toimik] apply_etoimik_decision found=false -&gt; no-op (0 rows) | `POST /ljvis/control-forms/tram-card/apply_etoimik_decision` | 200 | läbis |
| 43 |  | [e-toimik] apply_etoimik_decision found=false -&gt; no-op (0 rows) | `POST /ljvis/control-forms/tram-card/apply_etoimik_decision` | no rows | läbis |
| 44 |  | [search] published card visible as form_type=tram_control_card | `GET /ljvis/v1/control-forms/search/list` | 200 | läbis |
| 45 |  | [search] published card visible as form_type=tram_control_card | `GET /ljvis/v1/control-forms/search/list` | rows present | läbis |
| 46 |  | [search] published card visible as form_type=tram_control_card | `GET /ljvis/v1/control-forms/search/list` | every row is tram_control_card | läbis |
| 47 |  | [search] published card visible as form_type=tram_control_card | `GET /ljvis/v1/control-forms/search/list` | a tram- numbered card is present | läbis |
| 48 |  | [search] no-perm user -&gt; 403 | `GET /ljvis/v1/control-forms/search/list` | 403 without any read permission | läbis |
| 49 |  | edit/delete -&gt; 200 tombstone | `POST /ljvis/v1/control-forms/tram-card/edit/delete` | 200 | läbis |
| 50 |  | GET get after delete — status deleted | `GET /ljvis/v1/control-forms/tram-card/get` | 200 | läbis |
| 51 |  | GET get after delete — status deleted | `GET /ljvis/v1/control-forms/tram-card/get` | deleted | läbis |

### 9. labour-inspection

**Tööinspektsiooni kontrollkaart** · testitüübid: funktsionaalne, regressioon, integratsioon · kollektsioon `tests/postman/collections/labour-inspection.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 2 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 3 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 4 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 5 |  | [Auth] Login — Officer (no edit_locked) | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 6 |  | [Auth] Login — Officer (no edit_locked) | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 7 |  | POST edit/save — no permission (labour_inspection_form.write) → 403 | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | Returns 403 without labour_inspection_form.write | läbis |
| 8 |  | POST edit/save — missing inspectorName → 422 required | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | Returns 422 | läbis |
| 9 |  | POST edit/save — missing inspectorName → 422 required | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | field is inspectorName | läbis |
| 10 |  | POST edit/save — missing inspectorName → 422 required | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | code is required | läbis |
| 11 |  | POST edit/save — future inspectionDate → 422 future_date_not_allowed | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | Returns 422 | läbis |
| 12 |  | POST edit/save — future inspectionDate → 422 future_date_not_allowed | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | field is inspectionDate | läbis |
| 13 |  | POST edit/save — future inspectionDate → 422 future_date_not_allowed | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | code is future_date_not_allowed | läbis |
| 14 |  | POST edit/save — inspectorName over 200 chars → 422 max_length_exceeded | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | Returns 422 | läbis |
| 15 |  | POST edit/save — inspectorName over 200 chars → 422 max_length_exceeded | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | field is inspectorName | läbis |
| 16 |  | POST edit/save — inspectorName over 200 chars → 422 max_length_exceeded | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | code is max_length_exceeded | läbis |
| 17 |  | POST edit/save — companyRegCode over 20 chars → 422 max_length_exceeded | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | Returns 422 | läbis |
| 18 |  | POST edit/save — companyRegCode over 20 chars → 422 max_length_exceeded | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | field is companyRegCode | läbis |
| 19 |  | POST edit/save — companyRegCode over 20 chars → 422 max_length_exceeded | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | code is max_length_exceeded | läbis |
| 20 |  | POST edit/save — create new act → 200, save id/formNumber | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | Returns 200 | läbis |
| 21 |  | POST edit/save — create new act → 200, save id/formNumber | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | Response has id, formNumber, version=1 | läbis |
| 22 |  | GET control-forms/labour-inspection — no permission → 403 | `GET /ljvis/v1/control-forms/labour-inspection` | Returns 403 without read/view_unpublished permission | läbis |
| 23 |  | GET control-forms/labour-inspection — not found → 404 | `GET /ljvis/v1/control-forms/labour-inspection` | Returns 404 for nonexistent id | läbis |
| 24 |  | GET control-forms/labour-inspection — happy path, verify fields | `GET /ljvis/v1/control-forms/labour-inspection` | Returns 200 | läbis |
| 25 |  | GET control-forms/labour-inspection — happy path, verify fields | `GET /ljvis/v1/control-forms/labour-inspection` | status is saved | läbis |
| 26 |  | GET control-forms/labour-inspection — happy path, verify fields | `GET /ljvis/v1/control-forms/labour-inspection` | version is 1 | läbis |
| 27 |  | GET control-forms/labour-inspection — happy path, verify fields | `GET /ljvis/v1/control-forms/labour-inspection` | inspectorName matches | läbis |
| 28 |  | GET control-forms/labour-inspection — happy path, verify fields | `GET /ljvis/v1/control-forms/labour-inspection` | formNumber matches created id | läbis |
| 29 |  | POST edit/save — re-save while saved → 200, version stays 1 (no-bump rule) | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | Returns 200 | läbis |
| 30 |  | POST edit/save — re-save while saved → 200, version stays 1 (no-bump rule) | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | version stays 1 (saved-state resave rule) | läbis |
| 31 |  | POST edit/save — re-save while saved → 200, version stays 1 (no-bump rule) | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | form_number unchanged | läbis |
| 32 |  | POST edit/save — re-save again while saved → 200, version still 1 | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | Returns 200 | läbis |
| 33 |  | POST edit/save — re-save again while saved → 200, version still 1 | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | version still 1 | läbis |
| 34 |  | POST edit/confirm — no permission → 403 | `POST /ljvis/v1/control-forms/labour-inspection/edit/confirm` | Returns 403 without labour_inspection_form.write | läbis |
| 35 |  | POST edit/confirm — happy path → 200, status confirmed, version unchanged | `POST /ljvis/v1/control-forms/labour-inspection/edit/confirm` | Returns 200 | läbis |
| 36 |  | POST edit/confirm — happy path → 200, status confirmed, version unchanged | `POST /ljvis/v1/control-forms/labour-inspection/edit/confirm` | version unchanged by confirm | läbis |
| 37 |  | GET control-forms/labour-inspection — status is confirmed after confirm | `GET /ljvis/v1/control-forms/labour-inspection` | Returns 200 | läbis |
| 38 |  | GET control-forms/labour-inspection — status is confirmed after confirm | `GET /ljvis/v1/control-forms/labour-inspection` | status is confirmed | läbis |
| 39 |  | POST edit/confirm — already confirmed → 422 already_confirmed | `POST /ljvis/v1/control-forms/labour-inspection/edit/confirm` | Returns 422 | läbis |
| 40 |  | POST edit/confirm — already confirmed → 422 already_confirmed | `POST /ljvis/v1/control-forms/labour-inspection/edit/confirm` | code is already_confirmed | läbis |
| 41 |  | POST edit/save — officer (no edit_locked) editing confirmed act → 422 form_locked_after_confirm | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | Returns 422 | läbis |
| 42 |  | POST edit/save — officer (no edit_locked) editing confirmed act → 422 form_locked_after_confirm | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | code is form_locked_after_confirm | läbis |
| 43 |  | POST edit/save — admin (edit_locked) editing confirmed act → 200, version bumps to 2 | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | Returns 200 | läbis |
| 44 |  | POST edit/save — admin (edit_locked) editing confirmed act → 200, version bumps to 2 | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | version bumps to 2 (edit_locked re-save of locked data) | läbis |
| 45 |  | POST edit/save — create 2nd act with a violation → 200 | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | Returns 200 | läbis |
| 46 |  | POST edit/confirm — act with violations present → 200 confirmed | `POST /ljvis/v1/control-forms/labour-inspection/edit/confirm` | Returns 200 | läbis |
| 47 |  | POST edit/confirm — act with violations present → 200 confirmed | `POST /ljvis/v1/control-forms/labour-inspection/edit/confirm` | version unchanged by confirm | läbis |
| 48 |  | POST edit/delete — no permission (control_form.delete) → 403 | `POST /ljvis/v1/control-forms/labour-inspection/edit/delete` | Returns 403 without control_form.delete | läbis |
| 49 |  | POST edit/delete — happy path → 200 | `POST /ljvis/v1/control-forms/labour-inspection/edit/delete` | Returns 200 | läbis |
| 50 |  | GET control-forms/labour-inspection — deleted act still readable (audit retained) | `GET /ljvis/v1/control-forms/labour-inspection` | Returns 200 | läbis |
| 51 |  | GET control-forms/labour-inspection — deleted act still readable (audit retained) | `GET /ljvis/v1/control-forms/labour-inspection` | status is deleted | läbis |

### 10. foreign-violation-form

**Välisriigi kontrollkaart** · testitüübid: funktsionaalne, regressioon · kollektsioon `tests/postman/collections/foreign-violation-form.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 2 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 3 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 4 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 5 |  | [Auth] Login — Officer (no edit_locked) | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 6 |  | [Auth] Login — Officer (no edit_locked) | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 7 |  | POST foreign-violation-form/edit/save — no permission → 403 | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/save` | Returns 403 without permission | läbis |
| 8 |  | POST foreign-violation-form/edit/save — missing reportingCountryCode → 422 required | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/save` | Returns 422 | läbis |
| 9 |  | POST foreign-violation-form/edit/save — missing reportingCountryCode → 422 required | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/save` | Field is reportingCountryCode | läbis |
| 10 |  | POST foreign-violation-form/edit/save — missing reportingCountryCode → 422 required | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/save` | Code is required | läbis |
| 11 |  | POST foreign-violation-form/edit/save — missing reportingAuthority → 422 required | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/save` | Returns 422 | läbis |
| 12 |  | POST foreign-violation-form/edit/save — missing reportingAuthority → 422 required | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/save` | Field is reportingAuthority | läbis |
| 13 |  | POST foreign-violation-form/edit/save — missing reportingAuthority → 422 required | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/save` | Code is required | läbis |
| 14 |  | POST foreign-violation-form/edit/save — missing sanctionCode → 422 required | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/save` | Returns 422 | läbis |
| 15 |  | POST foreign-violation-form/edit/save — missing sanctionCode → 422 required | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/save` | Field is sanctionCode | läbis |
| 16 |  | POST foreign-violation-form/edit/save — missing sanctionCode → 422 required | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/save` | Code is required | läbis |
| 17 |  | POST foreign-violation-form/edit/save — recommendedMeasureCode=MUU without notes → 200 (not required) | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/save` | Returns 200 (recommendedMeasureNotes no longer required for MUU) | läbis |
| 18 |  | POST foreign-violation-form/edit/save — create (happy path) | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/save` | Returns 200 | läbis |
| 19 |  | POST foreign-violation-form/edit/save — create (happy path) | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/save` | id present | läbis |
| 20 |  | POST foreign-violation-form/edit/save — create (happy path) | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/save` | form_number has vr- prefix | läbis |
| 21 |  | POST foreign-violation-form/edit/save — create (happy path) | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/save` | version is 1 | läbis |
| 22 |  | POST foreign-violation-form/edit/save — re-save while saved (version unchanged) | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/save` | Returns 200 | läbis |
| 23 |  | POST foreign-violation-form/edit/save — re-save while saved (version unchanged) | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/save` | version stays 1 (saved-state resave rule) | läbis |
| 24 |  | POST foreign-violation-form/edit/confirm — no permission → 403 | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/confirm` | Returns 403 without permission | läbis |
| 25 |  | POST foreign-violation-form/edit/confirm — happy path (saved -&gt; confirmed, version unchanged) | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/confirm` | Returns 200 | läbis |
| 26 |  | POST foreign-violation-form/edit/confirm — happy path (saved -&gt; confirmed, version unchanged) | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/confirm` | version unchanged by confirm | läbis |
| 27 |  | POST foreign-violation-form/edit/save — officer (no edit_locked) saves confirmed form → 422 form_locked_after_confirm | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/save` | Returns 422 | läbis |
| 28 |  | POST foreign-violation-form/edit/save — officer (no edit_locked) saves confirmed form → 422 form_locked_after_confirm | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/save` | Code is form_locked_after_confirm | läbis |
| 29 |  | POST foreign-violation-form/edit/save — admin (edit_locked) saves confirmed form → 200, version bumps to 2 | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/save` | Returns 200 | läbis |
| 30 |  | POST foreign-violation-form/edit/save — admin (edit_locked) saves confirmed form → 200, version bumps to 2 | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/save` | version bumps to 2 (edit_locked re-save of confirmed form) | läbis |
| 31 |  | POST foreign-violation-form/edit/publish — happy path (confirmed -&gt; published, version unchanged) | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/publish` | Returns 200 | läbis |
| 32 |  | POST foreign-violation-form/edit/publish — happy path (confirmed -&gt; published, version unchanged) | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/publish` | version unchanged by publish | läbis |
| 33 |  | POST foreign-violation-form/edit/save — admin re-saves published form → 200, version bumps to 3 | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/save` | Returns 200 | läbis |
| 34 |  | POST foreign-violation-form/edit/save — admin re-saves published form → 200, version bumps to 3 | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/save` | version bumps to 3 (edit_locked re-save of published form) | läbis |
| 35 |  | [Setup] POST foreign-violation-form/edit/save — create notify-flow form (no notify flags yet) | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/save` | Returns 200 | läbis |
| 36 |  | [Setup] POST foreign-violation-form/edit/save — create notify-flow form (no notify flags yet) | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/save` | returns id | läbis |
| 37 |  | POST foreign-violation-form/edit/save — notifyLaborInspector=true is persisted, nothing sent yet | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/save` | Returns 200 | läbis |
| 38 |  | [Verify] resql foreign-violation-form/get — notify flag kept after save | `POST /ljvis/control-forms/foreign-violation-form/get` | 200 | läbis |
| 39 |  | [Verify] resql foreign-violation-form/get — notify flag kept after save | `POST /ljvis/control-forms/foreign-violation-form/get` | notifyLaborInspector stays true after save | läbis |
| 40 |  | GET /v1/notifications/outbound-log/list — save did NOT send labor_foreign_proposal | `GET /ljvis/v1/notifications/outbound-log/list` | 200 | läbis |
| 41 |  | GET /v1/notifications/outbound-log/list — save did NOT send labor_foreign_proposal | `GET /ljvis/v1/notifications/outbound-log/list` | no outbound_log row before publish | läbis |
| 42 |  | POST foreign-violation-form/edit/confirm — notify-flow form (flag kept, nothing sent yet) | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/confirm` | Returns 200 | läbis |
| 43 |  | GET /v1/notifications/outbound-log/list — confirm did NOT send labor_foreign_proposal | `GET /ljvis/v1/notifications/outbound-log/list` | 200 | läbis |
| 44 |  | GET /v1/notifications/outbound-log/list — confirm did NOT send labor_foreign_proposal | `GET /ljvis/v1/notifications/outbound-log/list` | no outbound_log row before publish | läbis |
| 45 |  | POST foreign-violation-form/edit/publish — notify-flow form (sends notifications) | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/publish` | Returns 200 | läbis |
| 46 |  | [Verify] resql foreign-violation-form/get — notify flag kept after publish | `POST /ljvis/control-forms/foreign-violation-form/get` | 200 | läbis |
| 47 |  | [Verify] resql foreign-violation-form/get — notify flag kept after publish | `POST /ljvis/control-forms/foreign-violation-form/get` | status published | läbis |
| 48 |  | [Verify] resql foreign-violation-form/get — notify flag kept after publish | `POST /ljvis/control-forms/foreign-violation-form/get` | notifyLaborInspector stays true after publish (resend on next publish) | läbis |
| 49 |  | GET /v1/notifications/outbound-log/list — publish created a labor_foreign_proposal row | `GET /ljvis/v1/notifications/outbound-log/list` | 200 | läbis |
| 50 |  | GET /v1/notifications/outbound-log/list — publish created a labor_foreign_proposal row | `GET /ljvis/v1/notifications/outbound-log/list` | outbound_log row for the published form exists | läbis |
| 51 |  | GET /v1/notifications/outbound-log/list — publish created a labor_foreign_proposal row | `GET /ljvis/v1/notifications/outbound-log/list` | row is not stuck at pre-send validation error | läbis |
| 52 |  | [Verify] resql xroad/etoimik/list_integration_log — postkast X-tee call logged (allServices) | `POST /ljvis/xroad/etoimik/list_integration_log` | 200 | läbis |
| 53 |  | [Verify] resql xroad/etoimik/list_integration_log — postkast X-tee call logged (allServices) | `POST /ljvis/xroad/etoimik/list_integration_log` | xroad_integration_log row for the postkast call exists | läbis |
| 54 |  | [Verify] resql xroad/etoimik/list_integration_log — postkast X-tee call logged (allServices) | `POST /ljvis/xroad/etoimik/list_integration_log` | logged call succeeded (dev PK mock) | läbis |
| 55 |  | POST foreign-violation-form/edit/save — admin edits published notify-flow form (no send) | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/save` | Returns 200 | läbis |
| 56 |  | POST foreign-violation-form/edit/confirm — re-confirm published notify-flow form | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/confirm` | Returns 200 | läbis |
| 57 |  | POST foreign-violation-form/edit/publish — re-publish notify-flow form (sends again) | `POST /ljvis/v1/control-forms/foreign-violation-form/edit/publish` | Returns 200 | läbis |
| 58 |  | GET /v1/notifications/outbound-log/list — re-publish sent labor_foreign_proposal again | `GET /ljvis/v1/notifications/outbound-log/list` | 200 | läbis |
| 59 |  | GET /v1/notifications/outbound-log/list — re-publish sent labor_foreign_proposal again | `GET /ljvis/v1/notifications/outbound-log/list` | two outbound_log rows after two publishes | läbis |

### 11. erru-ctud

**ERRU CTUD (tegevusloa kontroll)** · testitüübid: funktsionaalne, integratsioon, töökindlus, turve · kollektsioon `tests/postman/collections/erru-ctud.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 |  | [Auth] Login — Super Admin (ctud.read+create+send) | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 2 |  | [Auth] Login — Super Admin (ctud.read+create+send) | `POST /ljvis/auth/dev/dev-login` | JWT received | läbis |
| 3 |  | [Auth] Login — Org Admin (ctud.read+create, NO send) | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 4 |  | [Auth] Login — Org Admin (ctud.read+create, NO send) | `POST /ljvis/auth/dev/dev-login` | JWT received | läbis |
| 5 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 6 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | JWT received | läbis |
| 7 |  | [Create] Draft as admin → 200 initiated v1 | `POST /ljvis/v1/erru/ctud` | Returns 200 | läbis |
| 8 |  | [Create] Draft as admin → 200 initiated v1 | `POST /ljvis/v1/erru/ctud` | status initiated | läbis |
| 9 |  | [Create] Draft as admin → 200 initiated v1 | `POST /ljvis/v1/erru/ctud` | version is 1 | läbis |
| 10 |  | [Create] Draft as admin → 200 initiated v1 | `POST /ljvis/v1/erru/ctud` | businessCaseId generated | läbis |
| 11 |  | [AuthZ] Create without ctud.create → 403 | `POST /ljvis/v1/erru/ctud` | Returns 403 | läbis |
| 12 |  | [Validation] only 1 of 3 search criteria → 422 min_two_search_criteria | `POST /ljvis/v1/erru/ctud` | Returns 422 | läbis |
| 13 |  | [Validation] only 1 of 3 search criteria → 422 min_two_search_criteria | `POST /ljvis/v1/erru/ctud` | field is transportUndertakingName | läbis |
| 14 |  | [Validation] only 1 of 3 search criteria → 422 min_two_search_criteria | `POST /ljvis/v1/erru/ctud` | code is min_two_search_criteria | läbis |
| 15 |  | [Validation] undertaking name 'unknown' → 422 unknown_not_allowed | `POST /ljvis/v1/erru/ctud` | Returns 422 | läbis |
| 16 |  | [Validation] undertaking name 'unknown' → 422 unknown_not_allowed | `POST /ljvis/v1/erru/ctud` | field is transportUndertakingName | läbis |
| 17 |  | [Validation] undertaking name 'unknown' → 422 unknown_not_allowed | `POST /ljvis/v1/erru/ctud` | code is unknown_not_allowed | läbis |
| 18 |  | [Validation] vehicle number without country → 422 required | `POST /ljvis/v1/erru/ctud` | Returns 422 | läbis |
| 19 |  | [Validation] vehicle number without country → 422 required | `POST /ljvis/v1/erru/ctud` | field is vehicleRegistrationCountry | läbis |
| 20 |  | [Validation] vehicle number without country → 422 required | `POST /ljvis/v1/erru/ctud` | code is required | läbis |
| 21 |  | [Validation] missing target country → 422 required | `POST /ljvis/v1/erru/ctud` | Returns 422 | läbis |
| 22 |  | [Validation] missing target country → 422 required | `POST /ljvis/v1/erru/ctud` | field is ctudTo | läbis |
| 23 |  | [Validation] missing target country → 422 required | `POST /ljvis/v1/erru/ctud` | code is required | läbis |
| 24 |  | [Validation] 1-char target country → 422 invalid_country_code | `POST /ljvis/v1/erru/ctud` | Returns 422 | läbis |
| 25 |  | [Validation] 1-char target country → 422 invalid_country_code | `POST /ljvis/v1/erru/ctud` | field is ctudTo | läbis |
| 26 |  | [Validation] 1-char target country → 422 invalid_country_code | `POST /ljvis/v1/erru/ctud` | code is invalid_country_code | läbis |
| 27 |  | [Validation] missing requestSource → 422 required | `POST /ljvis/v1/erru/ctud` | Returns 422 | läbis |
| 28 |  | [Validation] missing requestSource → 422 required | `POST /ljvis/v1/erru/ctud` | field is requestSource | läbis |
| 29 |  | [Validation] missing requestSource → 422 required | `POST /ljvis/v1/erru/ctud` | code is required | läbis |
| 30 |  | [Validation] missing requestPurpose → 422 required | `POST /ljvis/v1/erru/ctud` | Returns 422 | läbis |
| 31 |  | [Validation] missing requestPurpose → 422 required | `POST /ljvis/v1/erru/ctud` | field is requestPurpose | läbis |
| 32 |  | [Validation] missing requestPurpose → 422 required | `POST /ljvis/v1/erru/ctud` | code is required | läbis |
| 33 |  | [Validation] undertaking name over 150 chars → 422 max_length_exceeded | `POST /ljvis/v1/erru/ctud` | Returns 422 | läbis |
| 34 |  | [Validation] undertaking name over 150 chars → 422 max_length_exceeded | `POST /ljvis/v1/erru/ctud` | field is transportUndertakingName | läbis |
| 35 |  | [Validation] undertaking name over 150 chars → 422 max_length_exceeded | `POST /ljvis/v1/erru/ctud` | code is max_length_exceeded | läbis |
| 36 |  | [Get] Read draft → 200, upper-cased, EE origin | `GET /ljvis/v1/erru/ctud` | Returns 200 | läbis |
| 37 |  | [Get] Read draft → 200, upper-cased, EE origin | `GET /ljvis/v1/erru/ctud` | direction outgoing | läbis |
| 38 |  | [Get] Read draft → 200, upper-cased, EE origin | `GET /ljvis/v1/erru/ctud` | ctudFrom is EE | läbis |
| 39 |  | [Get] Read draft → 200, upper-cased, EE origin | `GET /ljvis/v1/erru/ctud` | name upper-cased | läbis |
| 40 |  | [Get] Read draft → 200, upper-cased, EE origin | `GET /ljvis/v1/erru/ctud` | requestAllVehicles true | läbis |
| 41 |  | [Get] Read draft → 200, upper-cased, EE origin | `GET /ljvis/v1/erru/ctud` | no response yet | läbis |
| 42 |  | [AuthZ] Get without ctud.read → 403 | `GET /ljvis/v1/erru/ctud` | Returns 403 | läbis |
| 43 |  | [Get] Nonexistent → 404 | `GET /ljvis/v1/erru/ctud` | Returns 404 | läbis |
| 44 |  | [Update] Revise draft → v2, same businessCaseId | `PUT /ljvis/v1/erru/ctud` | Returns 200 | läbis |
| 45 |  | [Update] Revise draft → v2, same businessCaseId | `PUT /ljvis/v1/erru/ctud` | version incremented to 2 | läbis |
| 46 |  | [Update] Revise draft → v2, same businessCaseId | `PUT /ljvis/v1/erru/ctud` | still initiated | läbis |
| 47 |  | [Update] Revise draft → v2, same businessCaseId | `PUT /ljvis/v1/erru/ctud` | businessCaseId unchanged | läbis |
| 48 |  | [Update] Missing id → 422 | `PUT /ljvis/v1/erru/ctud` | Returns 422 | läbis |
| 49 |  | [Update] Missing id → 422 | `PUT /ljvis/v1/erru/ctud` | field is id | läbis |
| 50 |  | [List] Returns {content,total} | `GET /ljvis/v1/erru/ctud/search` | Returns 200 | läbis |
| 51 |  | [List] Returns {content,total} | `GET /ljvis/v1/erru/ctud/search` | has non-empty content array | läbis |
| 52 |  | [List] Returns {content,total} | `GET /ljvis/v1/erru/ctud/search` | total is a positive number consistent with content | läbis |
| 53 |  | [List] Returns {content,total} | `GET /ljvis/v1/erru/ctud/search` | one row per request (no snapshot duplicates) | läbis |
| 54 |  | [AuthZ] List without ctud.read → 403 | `GET /ljvis/v1/erru/ctud/search` | Returns 403 | läbis |
| 55 |  | [List] Filter direction=outgoing | `GET /ljvis/v1/erru/ctud/search` | Returns 200 | läbis |
| 56 |  | [List] Filter direction=outgoing | `GET /ljvis/v1/erru/ctud/search` | all rows outgoing | läbis |
| 57 |  | [List] OR-group: name OR licence number | `GET /ljvis/v1/erru/ctud/search` | Returns 200 | läbis |
| 58 |  | [List] OR-group: name OR licence number | `GET /ljvis/v1/erru/ctud/search` | OR semantics: matches either criterion | läbis |
| 59 |  | [AuthZ] Send without ctud.send → 403 | `POST /ljvis/v1/erru/ctud/send` | Returns 403 | läbis |
| 60 |  | [AuthZ] Draft unchanged after 403 | `GET /ljvis/v1/erru/ctud` | Returns 200 | läbis |
| 61 |  | [AuthZ] Draft unchanged after 403 | `GET /ljvis/v1/erru/ctud` | still initiated — refused send wrote no snapshot | läbis |
| 62 |  | [AuthZ] Draft unchanged after 403 | `GET /ljvis/v1/erru/ctud` | still version 2 | läbis |
| 63 |  | [Send] Create draft → DE | `POST /ljvis/v1/erru/ctud` | Draft created | läbis |
| 64 |  | [Send] DE → responded / Found | `POST /ljvis/v1/erru/ctud/send` | Send succeeded with 200 (mock responds deterministically) | läbis |
| 65 |  | [Send] Verify DE outcome | `GET /ljvis/v1/erru/ctud` | Returns 200 | läbis |
| 66 |  | [Send] Verify DE outcome | `GET /ljvis/v1/erru/ctud` | status is responded | läbis |
| 67 |  | [Send] Verify DE outcome | `GET /ljvis/v1/erru/ctud` | responseStatusCode is Found | läbis |
| 68 |  | [Send] Verify DE outcome | `GET /ljvis/v1/erru/ctud` | sentAt recorded | läbis |
| 69 |  | [Send] Verify DE outcome | `GET /ljvis/v1/erru/ctud` | technicalId assigned | läbis |
| 70 |  | [Send] Verify DE outcome | `GET /ljvis/v1/erru/ctud` | workflowId assigned | läbis |
| 71 |  | [Send] DE payload persisted | `GET /ljvis/v1/erru/ctud` | Returns 200 | läbis |
| 72 |  | [Send] DE payload persisted | `GET /ljvis/v1/erru/ctud` | respondingAuthority DE-BAG | läbis |
| 73 |  | [Send] DE payload persisted | `GET /ljvis/v1/erru/ctud` | riskBand Green | läbis |
| 74 |  | [Send] DE payload persisted | `GET /ljvis/v1/erru/ctud` | two community licences | läbis |
| 75 |  | [Send] DE payload persisted | `GET /ljvis/v1/erru/ctud` | true copy present | läbis |
| 76 |  | [Send] DE payload persisted | `GET /ljvis/v1/erru/ctud` | vehicle list returned (requestAllVehicles) | läbis |
| 77 |  | [Update] Edit a SENT request → 422 not_editable | `PUT /ljvis/v1/erru/ctud` | Returns 422 | läbis |
| 78 |  | [Update] Edit a SENT request → 422 not_editable | `PUT /ljvis/v1/erru/ctud` | code not_editable | läbis |
| 79 |  | [Send] Re-send a responded request → 422 not_sendable | `POST /ljvis/v1/erru/ctud/send` | Returns 422 | läbis |
| 80 |  | [Send] Re-send a responded request → 422 not_sendable | `POST /ljvis/v1/erru/ctud/send` | code not_sendable | läbis |
| 81 |  | [Send] Nonexistent → 404 | `POST /ljvis/v1/erru/ctud/send` | Returns 404 | läbis |
| 82 |  | [Send] Create draft → LV | `POST /ljvis/v1/erru/ctud` | Draft created | läbis |
| 83 |  | [Send] LV → responded / NotFound | `POST /ljvis/v1/erru/ctud/send` | Send succeeded with 200 (mock responds deterministically) | läbis |
| 84 |  | [Send] Verify LV outcome | `GET /ljvis/v1/erru/ctud` | Returns 200 | läbis |
| 85 |  | [Send] Verify LV outcome | `GET /ljvis/v1/erru/ctud` | status is responded | läbis |
| 86 |  | [Send] Verify LV outcome | `GET /ljvis/v1/erru/ctud` | responseStatusCode is NotFound | läbis |
| 87 |  | [Send] Verify LV outcome | `GET /ljvis/v1/erru/ctud` | sentAt recorded | läbis |
| 88 |  | [Send] Verify LV outcome | `GET /ljvis/v1/erru/ctud` | technicalId assigned | läbis |
| 89 |  | [Send] Verify LV outcome | `GET /ljvis/v1/erru/ctud` | workflowId assigned | läbis |
| 90 |  | [Send] Create draft → PL | `POST /ljvis/v1/erru/ctud` | Draft created | läbis |
| 91 |  | [Send] PL → responded / Timeout | `POST /ljvis/v1/erru/ctud/send` | Send succeeded with 200 (mock responds deterministically) | läbis |
| 92 |  | [Send] Verify PL outcome | `GET /ljvis/v1/erru/ctud` | Returns 200 | läbis |
| 93 |  | [Send] Verify PL outcome | `GET /ljvis/v1/erru/ctud` | status is responded | läbis |
| 94 |  | [Send] Verify PL outcome | `GET /ljvis/v1/erru/ctud` | responseStatusCode is Timeout | läbis |
| 95 |  | [Send] Verify PL outcome | `GET /ljvis/v1/erru/ctud` | sentAt recorded | läbis |
| 96 |  | [Send] Verify PL outcome | `GET /ljvis/v1/erru/ctud` | technicalId assigned | läbis |
| 97 |  | [Send] Verify PL outcome | `GET /ljvis/v1/erru/ctud` | workflowId assigned | läbis |
| 98 |  | [Send] Create draft → GR | `POST /ljvis/v1/erru/ctud` | Draft created | läbis |
| 99 |  | [Send] GR → responded / NotAvailable | `POST /ljvis/v1/erru/ctud/send` | Send succeeded with 200 (mock responds deterministically) | läbis |
| 100 |  | [Send] Verify GR outcome | `GET /ljvis/v1/erru/ctud` | Returns 200 | läbis |
| 101 |  | [Send] Verify GR outcome | `GET /ljvis/v1/erru/ctud` | status is responded | läbis |
| 102 |  | [Send] Verify GR outcome | `GET /ljvis/v1/erru/ctud` | responseStatusCode is NotAvailable | läbis |
| 103 |  | [Send] Verify GR outcome | `GET /ljvis/v1/erru/ctud` | sentAt recorded | läbis |
| 104 |  | [Send] Verify GR outcome | `GET /ljvis/v1/erru/ctud` | technicalId assigned | läbis |
| 105 |  | [Send] Verify GR outcome | `GET /ljvis/v1/erru/ctud` | workflowId assigned | läbis |
| 106 |  | [Send] Create draft → FI | `POST /ljvis/v1/erru/ctud` | Draft created | läbis |
| 107 |  | [Send] FI → error | `POST /ljvis/v1/erru/ctud/send` | Send fails with 502 (FI mock triggers transport failure) | läbis |
| 108 |  | [Send] Verify FI outcome | `GET /ljvis/v1/erru/ctud` | Returns 200 | läbis |
| 109 |  | [Send] Verify FI outcome | `GET /ljvis/v1/erru/ctud` | status is error | läbis |
| 110 |  | [Send] Retry from error is allowed (LJVIS2-144) | `POST /ljvis/v1/erru/ctud/send` | Retry accepted by the state machine (not 422) | läbis |
| 111 |  | [Send] Retry appended new snapshots | `GET /ljvis/v1/erru/ctud` | Returns 200 | läbis |
| 112 |  | [Send] Retry appended new snapshots | `GET /ljvis/v1/erru/ctud` | still error | läbis |
| 113 |  | [Send] Retry appended new snapshots | `GET /ljvis/v1/erru/ctud` | version grew past the first attempt | läbis |
| 114 |  | [Inbound] Capture list total before | `GET /ljvis/v1/erru/ctud/search` | Returns 200 | läbis |
| 115 |  | [Inbound] Serve valid request → Found + Grey risk | `POST /ljvis/erru/ctud/inbound-request` | Returns 200 | läbis |
| 116 |  | [Inbound] Serve valid request → Found + Grey risk | `POST /ljvis/erru/ctud/inbound-request` | statusCode Found | läbis |
| 117 |  | [Inbound] Serve valid request → Found + Grey risk | `POST /ljvis/erru/ctud/inbound-request` | respondingAuthority EE-TRAM | läbis |
| 118 |  | [Inbound] Serve valid request → Found + Grey risk | `POST /ljvis/erru/ctud/inbound-request` | riskBand Grey until EPIC 16 | läbis |
| 119 |  | [Inbound] Serve valid request → Found + Grey risk | `POST /ljvis/erru/ctud/inbound-request` | vehicle list returned | läbis |
| 120 |  | [Inbound] REPLAY same technicalId → same answer | `POST /ljvis/erru/ctud/inbound-request` | Returns 200 | läbis |
| 121 |  | [Inbound] REPLAY same technicalId → same answer | `POST /ljvis/erru/ctud/inbound-request` | same answer replayed | läbis |
| 122 |  | [Inbound] Replay created NO duplicate request | `GET /ljvis/v1/erru/ctud/search` | Returns 200 | läbis |
| 123 |  | [Inbound] Replay created NO duplicate request | `GET /ljvis/v1/erru/ctud/search` | exactly one new incoming request for two deliveries | läbis |
| 124 |  | [Inbound] Undertaking not in Estonia → NotFound | `POST /ljvis/erru/ctud/inbound-request` | Returns 200 | läbis |
| 125 |  | [Inbound] Undertaking not in Estonia → NotFound | `POST /ljvis/erru/ctud/inbound-request` | statusCode NotFound | läbis |
| 126 |  | [Inbound] Undertaking not in Estonia → NotFound | `POST /ljvis/erru/ctud/inbound-request` | no undertaking data disclosed | läbis |
| 127 |  | [Inbound] requestAllVehicles=false → no vehicle list | `POST /ljvis/erru/ctud/inbound-request` | Returns 200 | läbis |
| 128 |  | [Inbound] requestAllVehicles=false → no vehicle list | `POST /ljvis/erru/ctud/inbound-request` | Found | läbis |
| 129 |  | [Inbound] requestAllVehicles=false → no vehicle list | `POST /ljvis/erru/ctud/inbound-request` | vehicle list empty | läbis |
| 130 |  | [Inbound] Missing technicalId → 400 InvalidData | `POST /ljvis/erru/ctud/inbound-request` | Returns 400 | läbis |
| 131 |  | [Inbound] Missing technicalId → 400 InvalidData | `POST /ljvis/erru/ctud/inbound-request` | statusCode InvalidData | läbis |
| 132 |  | [Inbound] Missing workflowId → 400 InvalidData | `POST /ljvis/erru/ctud/inbound-request` | Returns 400 | läbis |
| 133 |  | [Inbound] Missing workflowId → 400 InvalidData | `POST /ljvis/erru/ctud/inbound-request` | statusCode InvalidData | läbis |
| 134 |  | [Inbound] Missing from → 400 InvalidData | `POST /ljvis/erru/ctud/inbound-request` | Returns 400 | läbis |
| 135 |  | [Inbound] Missing from → 400 InvalidData | `POST /ljvis/erru/ctud/inbound-request` | statusCode InvalidData | läbis |
| 136 |  | [Inbound] Missing businessCaseId → 400 InvalidData | `POST /ljvis/erru/ctud/inbound-request` | Returns 400 | läbis |
| 137 |  | [Inbound] Missing businessCaseId → 400 InvalidData | `POST /ljvis/erru/ctud/inbound-request` | statusCode InvalidData | läbis |
| 138 |  | [Inbound] Missing originatingAuthority → 400 InvalidData | `POST /ljvis/erru/ctud/inbound-request` | Returns 400 | läbis |
| 139 |  | [Inbound] Missing originatingAuthority → 400 InvalidData | `POST /ljvis/erru/ctud/inbound-request` | statusCode InvalidData | läbis |
| 140 |  | [Inbound] Missing requestSource → 400 InvalidData | `POST /ljvis/erru/ctud/inbound-request` | Returns 400 | läbis |
| 141 |  | [Inbound] Missing requestSource → 400 InvalidData | `POST /ljvis/erru/ctud/inbound-request` | statusCode InvalidData | läbis |
| 142 |  | [Inbound] Missing requestPurpose → 400 InvalidData | `POST /ljvis/erru/ctud/inbound-request` | Returns 400 | läbis |
| 143 |  | [Inbound] Missing requestPurpose → 400 InvalidData | `POST /ljvis/erru/ctud/inbound-request` | statusCode InvalidData | läbis |
| 144 |  | [Inbound] Fewer than 2 search criteria → 400 | `POST /ljvis/erru/ctud/inbound-request` | Returns 400 | läbis |
| 145 |  | [Inbound] Undertaking name 'unknown' → 400 | `POST /ljvis/erru/ctud/inbound-request` | Returns 400 | läbis |
| 146 |  | [Inbound] Served request appears in the CTUD list | `GET /ljvis/v1/erru/ctud/search` | Returns 200 | läbis |
| 147 |  | [Inbound] Served request appears in the CTUD list | `GET /ljvis/v1/erru/ctud/search` | inbound requests visible to operators | läbis |
| 148 |  | [Inbound] Served request appears in the CTUD list | `GET /ljvis/v1/erru/ctud/search` | answered inbound present | läbis |

### 12. erru-cgr

**ERRU CGR (mainepäring)** · testitüübid: funktsionaalne, integratsioon, töökindlus, turve · kollektsioon `tests/postman/collections/erru-cgr.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 |  | [Auth] Login — Super Admin (cgr.read+create+send) | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 2 |  | [Auth] Login — Super Admin (cgr.read+create+send) | `POST /ljvis/auth/dev/dev-login` | JWT received | läbis |
| 3 |  | [Auth] Login — Org Admin (cgr.read+create, NO send) | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 4 |  | [Auth] Login — Org Admin (cgr.read+create, NO send) | `POST /ljvis/auth/dev/dev-login` | JWT received | läbis |
| 5 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 6 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | JWT received | läbis |
| 7 |  | [Create] Draft with 7A (name) only → 200 initiated v1 | `POST /ljvis/v1/erru/cgr/draft/create` | Returns 200 | läbis |
| 8 |  | [Create] Draft with 7A (name) only → 200 initiated v1 | `POST /ljvis/v1/erru/cgr/draft/create` | status initiated | läbis |
| 9 |  | [Create] Draft with 7A (name) only → 200 initiated v1 | `POST /ljvis/v1/erru/cgr/draft/create` | version is 1 | läbis |
| 10 |  | [Create] Draft with 7A (name) only → 200 initiated v1 | `POST /ljvis/v1/erru/cgr/draft/create` | businessCaseId generated with CGR-EE prefix | läbis |
| 11 |  | [Create] Verify 7A draft: uppercased fields, cgrTo persisted | `GET /ljvis/v1/erru/cgr/get` | Returns 200 | läbis |
| 12 |  | [Create] Verify 7A draft: uppercased fields, cgrTo persisted | `GET /ljvis/v1/erru/cgr/get` | tmFirstName is upper-cased | läbis |
| 13 |  | [Create] Verify 7A draft: uppercased fields, cgrTo persisted | `GET /ljvis/v1/erru/cgr/get` | tmFamilyName is upper-cased | läbis |
| 14 |  | [Create] Verify 7A draft: uppercased fields, cgrTo persisted | `GET /ljvis/v1/erru/cgr/get` | cgrTo persisted as given | läbis |
| 15 |  | [Create] Verify 7A draft: uppercased fields, cgrTo persisted | `GET /ljvis/v1/erru/cgr/get` | cgrFrom is EE | läbis |
| 16 |  | [Create] Verify 7A draft: uppercased fields, cgrTo persisted | `GET /ljvis/v1/erru/cgr/get` | direction is outgoing | läbis |
| 17 |  | [Create] Verify 7A draft: uppercased fields, cgrTo persisted | `GET /ljvis/v1/erru/cgr/get` | memberStates empty before send | läbis |
| 18 |  | [Create] Draft with empty cgrTo → defaults to broadcast ZZ | `POST /ljvis/v1/erru/cgr/draft/create` | Returns 200 | läbis |
| 19 |  | [Create] Verify broadcast draft: cgrTo is ZZ | `GET /ljvis/v1/erru/cgr/get` | Returns 200 | läbis |
| 20 |  | [Create] Verify broadcast draft: cgrTo is ZZ | `GET /ljvis/v1/erru/cgr/get` | cgrTo defaulted to ZZ (all member states) | läbis |
| 21 |  | [Create] Draft with 7B (certificate) only → 200 | `POST /ljvis/v1/erru/cgr/draft/create` | Returns 200 | läbis |
| 22 |  | [Create] Draft with 7B (certificate) only → 200 | `POST /ljvis/v1/erru/cgr/draft/create` | status initiated | läbis |
| 23 |  | [Validation] Neither 7A nor 7B filled → 422 search_choice_required | `POST /ljvis/v1/erru/cgr/draft/create` | Returns 422 | läbis |
| 24 |  | [Validation] Neither 7A nor 7B filled → 422 search_choice_required | `POST /ljvis/v1/erru/cgr/draft/create` | code is search_choice_required | läbis |
| 25 |  | [Validation] 7A partial (missing date of birth) → 422 name_block_incomplete | `POST /ljvis/v1/erru/cgr/draft/create` | Returns 422 | läbis |
| 26 |  | [Validation] 7A partial (missing date of birth) → 422 name_block_incomplete | `POST /ljvis/v1/erru/cgr/draft/create` | code is name_block_incomplete | läbis |
| 27 |  | [Validation] 7B partial (missing issue country) → 422 certificate_block_incomplete | `POST /ljvis/v1/erru/cgr/draft/create` | Returns 422 | läbis |
| 28 |  | [Validation] 7B partial (missing issue country) → 422 certificate_block_incomplete | `POST /ljvis/v1/erru/cgr/draft/create` | code is certificate_block_incomplete | läbis |
| 29 |  | [Validation] Missing originatingAuthority → 422 required | `POST /ljvis/v1/erru/cgr/draft/create` | Returns 422 | läbis |
| 30 |  | [Validation] Missing originatingAuthority → 422 required | `POST /ljvis/v1/erru/cgr/draft/create` | field is originatingAuthority | läbis |
| 31 |  | [Validation] Missing originatingAuthority → 422 required | `POST /ljvis/v1/erru/cgr/draft/create` | code is required | läbis |
| 32 |  | [Validation] Invalid cgrTo length → 422 invalid_country_code | `POST /ljvis/v1/erru/cgr/draft/create` | Returns 422 | läbis |
| 33 |  | [Validation] Invalid cgrTo length → 422 invalid_country_code | `POST /ljvis/v1/erru/cgr/draft/create` | code is invalid_country_code | läbis |
| 34 |  | [Revise] Update 7A draft: change cgrTo and name → version 2 | `PUT /ljvis/v1/erru/cgr/draft/revise` | Returns 200 | läbis |
| 35 |  | [Revise] Update 7A draft: change cgrTo and name → version 2 | `PUT /ljvis/v1/erru/cgr/draft/revise` | version bumped to 2 | läbis |
| 36 |  | [Revise] Update 7A draft: change cgrTo and name → version 2 | `PUT /ljvis/v1/erru/cgr/draft/revise` | businessCaseId unchanged | läbis |
| 37 |  | [Revise] Verify revision persisted: cgrTo=SE, family name updated | `GET /ljvis/v1/erru/cgr/get` | Returns 200 | läbis |
| 38 |  | [Revise] Verify revision persisted: cgrTo=SE, family name updated | `GET /ljvis/v1/erru/cgr/get` | cgrTo updated to SE | läbis |
| 39 |  | [Revise] Verify revision persisted: cgrTo=SE, family name updated | `GET /ljvis/v1/erru/cgr/get` | tmFamilyName updated | läbis |
| 40 |  | [Revise] Verify revision persisted: cgrTo=SE, family name updated | `GET /ljvis/v1/erru/cgr/get` | requestPurpose updated to Control | läbis |
| 41 |  | [Revise] Verify revision persisted: cgrTo=SE, family name updated | `GET /ljvis/v1/erru/cgr/get` | version is 2 | läbis |
| 42 |  | [Revise] Non-existent key → 422 not_editable, no row created | `PUT /ljvis/v1/erru/cgr/draft/revise` | Returns 422 | läbis |
| 43 |  | [Revise] Non-existent key → 422 not_editable, no row created | `PUT /ljvis/v1/erru/cgr/draft/revise` | code is not_editable | läbis |
| 44 |  | [Revise] Missing id → 422 required | `PUT /ljvis/v1/erru/cgr/draft/revise` | Returns 422 | läbis |
| 45 |  | [Revise] Missing id → 422 required | `PUT /ljvis/v1/erru/cgr/draft/revise` | field is id | läbis |
| 46 |  | [Revise] Missing id → 422 required | `PUT /ljvis/v1/erru/cgr/draft/revise` | code is required | läbis |
| 47 |  | [AuthZ] Create without cgr.create → 403 | `POST /ljvis/v1/erru/cgr/draft/create` | Returns 403 | läbis |
| 48 |  | [AuthZ] Create without cgr.create → 403 | `POST /ljvis/v1/erru/cgr/draft/create` | No businessCaseId returned | läbis |
| 49 |  | [AuthZ] Read without cgr.read → 403 | `GET /ljvis/v1/erru/cgr/get` | Returns 403 | läbis |
| 50 |  | [AuthZ] Revise without cgr.create → 403, draft unchanged | `PUT /ljvis/v1/erru/cgr/draft/revise` | Returns 403 | läbis |
| 51 |  | [AuthZ] Draft still at version 2 (403 revise had no side effect) | `GET /ljvis/v1/erru/cgr/get` | Returns 200 | läbis |
| 52 |  | [AuthZ] Draft still at version 2 (403 revise had no side effect) | `GET /ljvis/v1/erru/cgr/get` | version still 2 | läbis |
| 53 |  | [AuthZ] Draft still at version 2 (403 revise had no side effect) | `GET /ljvis/v1/erru/cgr/get` | cgrTo still SE (unaffected by rejected revise) | läbis |
| 54 |  | [AuthZ] Org Admin (cgr.create, no cgr.send) CAN create a draft | `POST /ljvis/v1/erru/cgr/draft/create` | Returns 200 | läbis |
| 55 |  | [AuthZ] Org Admin (cgr.create, no cgr.send) CAN create a draft | `POST /ljvis/v1/erru/cgr/draft/create` | status initiated | läbis |
| 56 |  | [AuthZ] Send without cgr.send → 403 | `POST /ljvis/v1/erru/cgr/send` | Send forbidden for cgr_nosend user | läbis |
| 57 |  | [AuthZ] Broadcast draft still initiated after 403 | `GET /ljvis/v1/erru/cgr/get` | Returns 200 | läbis |
| 58 |  | [AuthZ] Broadcast draft still initiated after 403 | `GET /ljvis/v1/erru/cgr/get` | status still initiated after 403 send | läbis |
| 59 |  | [Send] Create broadcast 7A draft for ZZ send | `POST /ljvis/v1/erru/cgr/draft/create` | Returns 200 | läbis |
| 60 |  | [Send] Create broadcast 7A draft for ZZ send | `POST /ljvis/v1/erru/cgr/draft/create` | status initiated | läbis |
| 61 |  | [Send] Broadcast ZZ → 200 sent, 4 member-state entries | `POST /ljvis/v1/erru/cgr/send` | Returns 200 | läbis |
| 62 |  | [Send] Broadcast ZZ → 200 sent, 4 member-state entries | `POST /ljvis/v1/erru/cgr/send` | status sent | läbis |
| 63 |  | [Send] Broadcast ZZ → 200 sent, 4 member-state entries | `POST /ljvis/v1/erru/cgr/send` | id echoed | läbis |
| 64 |  | [Send] Broadcast ZZ → 200 sent, 4 member-state entries | `POST /ljvis/v1/erru/cgr/send` | 4 member-state entries | läbis |
| 65 |  | [Send] Broadcast ZZ → 200 sent, 4 member-state entries | `POST /ljvis/v1/erru/cgr/send` | DE entry is Found | läbis |
| 66 |  | [Send] Broadcast ZZ → 200 sent, 4 member-state entries | `POST /ljvis/v1/erru/cgr/send` | DE has transport manager details | läbis |
| 67 |  | [Send] Broadcast ZZ → 200 sent, 4 member-state entries | `POST /ljvis/v1/erru/cgr/send` | PL entry is NotAvailable | läbis |
| 68 |  | [Send] Broadcast ZZ → 200 sent, 4 member-state entries | `POST /ljvis/v1/erru/cgr/send` | PL has no TM details | läbis |
| 69 |  | [Send] Verify broadcast: DB status=sent, memberStates persisted, NYSIIS keys set | `GET /ljvis/v1/erru/cgr/get` | Returns 200 | läbis |
| 70 |  | [Send] Verify broadcast: DB status=sent, memberStates persisted, NYSIIS keys set | `GET /ljvis/v1/erru/cgr/get` | status is sent (terminal) | läbis |
| 71 |  | [Send] Verify broadcast: DB status=sent, memberStates persisted, NYSIIS keys set | `GET /ljvis/v1/erru/cgr/get` | 4 memberState entries persisted in DB (ZZ broadcast) | läbis |
| 72 |  | [Send] Verify broadcast: DB status=sent, memberStates persisted, NYSIIS keys set | `GET /ljvis/v1/erru/cgr/get` | tmFirstNameSearchKey computed | läbis |
| 73 |  | [Send] Verify broadcast: DB status=sent, memberStates persisted, NYSIIS keys set | `GET /ljvis/v1/erru/cgr/get` | tmFamilyNameSearchKey computed | läbis |
| 74 |  | [Send] Re-send an already-sent request → 422 not_sendable | `POST /ljvis/v1/erru/cgr/send` | Cannot re-send from sent state | läbis |
| 75 |  | [Send] Re-send an already-sent request → 422 not_sendable | `POST /ljvis/v1/erru/cgr/send` | code not_sendable | läbis |
| 76 |  | [Resend] Resend to PL (NotAvailable) → 200, PL entry updated | `POST /ljvis/v1/erru/cgr/resend` | Resend returns 200 | läbis |
| 77 |  | [Resend] Resend to PL (NotAvailable) → 200, PL entry updated | `POST /ljvis/v1/erru/cgr/resend` | status still sent | läbis |
| 78 |  | [Resend] Resend to PL (NotAvailable) → 200, PL entry updated | `POST /ljvis/v1/erru/cgr/resend` | updatedMemberState is PL | läbis |
| 79 |  | [Resend] Resend to PL (NotAvailable) → 200, PL entry updated | `POST /ljvis/v1/erru/cgr/resend` | still 4 entries total | läbis |
| 80 |  | [Resend] Resend to PL (NotAvailable) → 200, PL entry updated | `POST /ljvis/v1/erru/cgr/resend` | DE entry unchanged after resend | läbis |
| 81 |  | [Resend] Verify: workflowId unchanged, new snapshot added | `GET /ljvis/v1/erru/cgr/get` | Returns 200 | läbis |
| 82 |  | [Resend] Verify: workflowId unchanged, new snapshot added | `GET /ljvis/v1/erru/cgr/get` | workflowId preserved after resend | läbis |
| 83 |  | [Resend] Verify: workflowId unchanged, new snapshot added | `GET /ljvis/v1/erru/cgr/get` | version incremented (new snapshot) | läbis |
| 84 |  | [Resend] Missing memberStateCode → 400 | `POST /ljvis/v1/erru/cgr/resend` | 400 when memberStateCode missing | läbis |
| 85 |  | [Resend] AuthZ: without cgr.send → 403 | `POST /ljvis/v1/erru/cgr/resend` | Resend forbidden for nosend user | läbis |
| 86 |  | [Resend] Resend to FI (transport failure) → 502, request NOT moved to error | `POST /ljvis/v1/erru/cgr/resend` | Transport failure returns 502 | läbis |
| 87 |  | [Resend] Verify: still 'sent' after failed resend (not degraded to error) | `GET /ljvis/v1/erru/cgr/get` | Returns 200 | läbis |
| 88 |  | [Resend] Verify: still 'sent' after failed resend (not degraded to error) | `GET /ljvis/v1/erru/cgr/get` | status is still sent, not error | läbis |
| 89 |  | [Resend] Verify: still 'sent' after failed resend (not degraded to error) | `GET /ljvis/v1/erru/cgr/get` | no new snapshot appended on transport failure | läbis |
| 90 |  | [Resend] Verify: still 'sent' after failed resend (not degraded to error) | `GET /ljvis/v1/erru/cgr/get` | other countries unaffected | läbis |
| 91 |  | [Resend] Retry to FI is immediately possible (no not_resendable lock) | `POST /ljvis/v1/erru/cgr/resend` | Retry is handled as a transport failure again (502), not blocked as not_resendable (422) | läbis |
| 92 |  | [Send] Create single-country DE draft | `POST /ljvis/v1/erru/cgr/draft/create` | Returns 200 | läbis |
| 93 |  | [Send] DE → 200 sent, 1 member-state entry (Found) | `POST /ljvis/v1/erru/cgr/send` | Returns 200 | läbis |
| 94 |  | [Send] DE → 200 sent, 1 member-state entry (Found) | `POST /ljvis/v1/erru/cgr/send` | 1 member-state entry | läbis |
| 95 |  | [Send] DE → 200 sent, 1 member-state entry (Found) | `POST /ljvis/v1/erru/cgr/send` | DE Found | läbis |
| 96 |  | [Send] Create FI draft (will trigger transport failure) | `POST /ljvis/v1/erru/cgr/draft/create` | Returns 200 | läbis |
| 97 |  | [Send] FI → 502 send_failed, request transitions to error | `POST /ljvis/v1/erru/cgr/send` | Transport failure returns 502 | läbis |
| 98 |  | [Send] Verify FI draft is in error state | `GET /ljvis/v1/erru/cgr/get` | Returns 200 | läbis |
| 99 |  | [Send] Verify FI draft is in error state | `GET /ljvis/v1/erru/cgr/get` | status is error | läbis |
| 100 |  | [Send] Verify FI draft is in error state | `GET /ljvis/v1/erru/cgr/get` | error_message present | läbis |
| 101 |  | [Send] Retry from error is allowed (LJVIS2-139) | `POST /ljvis/v1/erru/cgr/send` | Retry handled (200 or 502, not 422) | läbis |
| 102 |  | [Send] Missing id → 400 | `POST /ljvis/v1/erru/cgr/send` | 400 when id missing | läbis |
| 103 |  | [Send] Nonexistent id → 404 | `POST /ljvis/v1/erru/cgr/send` | 404 for nonexistent id | läbis |
| 104 |  | [Inbound] Capture CGR row count before Heartbeat | `GET /ljvis/v1/erru/cgr/get` | Returns 200 | läbis |
| 105 |  | [Inbound] Heartbeat → NotFound, nothing stored | `POST /ljvis/erru/cgr/inbound-request` | Returns 200 | läbis |
| 106 |  | [Inbound] Heartbeat → NotFound, nothing stored | `POST /ljvis/erru/cgr/inbound-request` | statusCode NotFound for Heartbeat | läbis |
| 107 |  | [Inbound] Name-based: TAMM → Found+Fit (from MTR mock) | `POST /ljvis/erru/cgr/inbound-request` | Returns 200 | läbis |
| 108 |  | [Inbound] Name-based: TAMM → Found+Fit (from MTR mock) | `POST /ljvis/erru/cgr/inbound-request` | memberStateCode EE | läbis |
| 109 |  | [Inbound] Name-based: TAMM → Found+Fit (from MTR mock) | `POST /ljvis/erru/cgr/inbound-request` | statusCode Found | läbis |
| 110 |  | [Inbound] Name-based: TAMM → Found+Fit (from MTR mock) | `POST /ljvis/erru/cgr/inbound-request` | TM details present | läbis |
| 111 |  | [Inbound] Name-based: TAMM → Found+Fit (from MTR mock) | `POST /ljvis/erru/cgr/inbound-request` | fitnessStatus Fit | läbis |
| 112 |  | [Inbound] Name-based: TAMM → Found+Fit (from MTR mock) | `POST /ljvis/erru/cgr/inbound-request` | respondingAuthority EE-TRAM | läbis |
| 113 |  | [Inbound] REPLAY same technicalId → same answer, no duplicate | `POST /ljvis/erru/cgr/inbound-request` | Returns 200 | läbis |
| 114 |  | [Inbound] REPLAY same technicalId → same answer, no duplicate | `POST /ljvis/erru/cgr/inbound-request` | Replayed answer is EE/Found — idempotent with first delivery | läbis |
| 115 |  | [Inbound] Person not in EE register → NotFound | `POST /ljvis/erru/cgr/inbound-request` | Returns 200 | läbis |
| 116 |  | [Inbound] Person not in EE register → NotFound | `POST /ljvis/erru/cgr/inbound-request` | statusCode NotFound | läbis |
| 117 |  | [Inbound] Person not in EE register → NotFound | `POST /ljvis/erru/cgr/inbound-request` | no TM details on NotFound | läbis |
| 118 |  | [Inbound] Certificate-based (EE-CPC-2020-00111) → Found+Fit | `POST /ljvis/erru/cgr/inbound-request` | Returns 200 | läbis |
| 119 |  | [Inbound] Certificate-based (EE-CPC-2020-00111) → Found+Fit | `POST /ljvis/erru/cgr/inbound-request` | statusCode Found | läbis |
| 120 |  | [Inbound] Certificate-based (EE-CPC-2020-00111) → Found+Fit | `POST /ljvis/erru/cgr/inbound-request` | searchMethod NYSIIS | läbis |
| 121 |  | [Inbound] Certificate-based (EE-CPC-2020-00111) → Found+Fit | `POST /ljvis/erru/cgr/inbound-request` | certificateNumber matches | läbis |
| 122 |  | [Inbound] Missing technicalId → 400 | `POST /ljvis/erru/cgr/inbound-request` | 400 when technicalId missing | läbis |
| 123 |  | [Inbound] Missing workflowId → 400 | `POST /ljvis/erru/cgr/inbound-request` | 400 when workflowId missing | läbis |
| 124 |  | [Inbound] Missing from → 400 | `POST /ljvis/erru/cgr/inbound-request` | 400 when from missing | läbis |
| 125 |  | [Inbound] Missing businessCaseId → 400 | `POST /ljvis/erru/cgr/inbound-request` | 400 when businessCaseId missing | läbis |
| 126 |  | [Inbound] Missing originatingAuthority → 400 | `POST /ljvis/erru/cgr/inbound-request` | 400 when originatingAuthority missing | läbis |
| 127 |  | [List] Create isolated draft for filter tests | `POST /ljvis/v1/erru/cgr/draft/create` | Returns 200 | läbis |
| 128 |  | [List] Returns {content,total} | `GET /ljvis/v1/erru/cgr/search` | Returns 200 | läbis |
| 129 |  | [List] Returns {content,total} | `GET /ljvis/v1/erru/cgr/search` | has non-empty content array | läbis |
| 130 |  | [List] Returns {content,total} | `GET /ljvis/v1/erru/cgr/search` | total is a positive number consistent with content | läbis |
| 131 |  | [List] Returns {content,total} | `GET /ljvis/v1/erru/cgr/search` | one row per request (no snapshot duplicates) | läbis |
| 132 |  | [AuthZ] List without cgr.read → 403 | `GET /ljvis/v1/erru/cgr/search` | Returns 403 | läbis |
| 133 |  | [List] Filter tmFirstName+tmFamilyName AND-combined → matches isolated draft | `GET /ljvis/v1/erru/cgr/search` | Returns 200 | läbis |
| 134 |  | [List] Filter tmFirstName+tmFamilyName AND-combined → matches isolated draft | `GET /ljvis/v1/erru/cgr/search` | exactly one match | läbis |
| 135 |  | [List] Filter tmFirstName+tmFamilyName AND-combined → matches isolated draft | `GET /ljvis/v1/erru/cgr/search` | matches the isolated draft | läbis |
| 136 |  | [List] tmFirstName matches but tmFamilyName mismatched → empty (AND, not OR) | `GET /ljvis/v1/erru/cgr/search` | Returns 200 | läbis |
| 137 |  | [List] tmFirstName matches but tmFamilyName mismatched → empty (AND, not OR) | `GET /ljvis/v1/erru/cgr/search` | no matches — AND semantics confirmed | läbis |
| 138 |  | [List] Broadcast request shows cgrTo=ZZ | `GET /ljvis/v1/erru/cgr/search` | Returns 200 | läbis |
| 139 |  | [List] Broadcast request shows cgrTo=ZZ | `GET /ljvis/v1/erru/cgr/search` | exactly one match | läbis |
| 140 |  | [List] Broadcast request shows cgrTo=ZZ | `GET /ljvis/v1/erru/cgr/search` | cgrTo is ZZ | läbis |
| 141 |  | [List] Broadcast request shows cgrTo=ZZ | `GET /ljvis/v1/erru/cgr/search` | status is sent | läbis |
| 142 |  | [List] Broadcast request shows cgrTo=ZZ | `GET /ljvis/v1/erru/cgr/search` | responseStatusCode is null for broadcast (breakdown only in detail view) | läbis |
| 143 |  | [List] Single-country sent request shows responseStatusCode | `GET /ljvis/v1/erru/cgr/search` | Returns 200 | läbis |
| 144 |  | [List] Single-country sent request shows responseStatusCode | `GET /ljvis/v1/erru/cgr/search` | exactly one match | läbis |
| 145 |  | [List] Single-country sent request shows responseStatusCode | `GET /ljvis/v1/erru/cgr/search` | cgrTo is DE (single country) | läbis |
| 146 |  | [List] Single-country sent request shows responseStatusCode | `GET /ljvis/v1/erru/cgr/search` | responseStatusCode is Found | läbis |
| 147 |  | [List] Inbound requests excluded — list is outgoing-only | `GET /ljvis/v1/erru/cgr/search` | Returns 200 | läbis |
| 148 |  | [List] Inbound requests excluded — list is outgoing-only | `GET /ljvis/v1/erru/cgr/search` | inbound request not in outgoing-only list | läbis |
| 149 |  | [List] Sorting by businessCaseId asc is honoured | `GET /ljvis/v1/erru/cgr/search` | Returns 200 | läbis |
| 150 |  | [List] Sorting by businessCaseId asc is honoured | `GET /ljvis/v1/erru/cgr/search` | sorted ascending | läbis |

### 13. erru-rsi

**ERRU RSI (tehnokontrolli teade)** · testitüübid: funktsionaalne, integratsioon, töökindlus, turve · kollektsioon `tests/postman/collections/erru-rsi.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 |  | [Auth] Login — Super Admin (rsi.read+create+send) | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 2 |  | [Auth] Login — Super Admin (rsi.read+create+send) | `POST /ljvis/auth/dev/dev-login` | JWT received | läbis |
| 3 |  | [Auth] Login — Org Admin (rsi.read+create, NO send) | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 4 |  | [Auth] Login — Org Admin (rsi.read+create, NO send) | `POST /ljvis/auth/dev/dev-login` | JWT received | läbis |
| 5 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 6 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | JWT received | läbis |
| 7 |  | [Create] Minimal required fields (no driver, no identificationDetails) → 200 initiated v1 | `POST /ljvis/v1/erru/rsi/request/save` | Returns 200 | läbis |
| 8 |  | [Create] Minimal required fields (no driver, no identificationDetails) → 200 initiated v1 | `POST /ljvis/v1/erru/rsi/request/save` | status is initiated | läbis |
| 9 |  | [Create] Minimal required fields (no driver, no identificationDetails) → 200 initiated v1 | `POST /ljvis/v1/erru/rsi/request/save` | version is 1 | läbis |
| 10 |  | [Create] Minimal required fields (no driver, no identificationDetails) → 200 initiated v1 | `POST /ljvis/v1/erru/rsi/request/save` | businessCaseId matches EE-RSI-YYYY-NNNNN | läbis |
| 11 |  | [Get] Verify minimal draft: uppercased, rsiFrom=EE, rsiTo=LV, optional fields null | `GET /ljvis/v1/erru/rsi/get` | Returns 200 | läbis |
| 12 |  | [Get] Verify minimal draft: uppercased, rsiFrom=EE, rsiTo=LV, optional fields null | `GET /ljvis/v1/erru/rsi/get` | status is initiated | läbis |
| 13 |  | [Get] Verify minimal draft: uppercased, rsiFrom=EE, rsiTo=LV, optional fields null | `GET /ljvis/v1/erru/rsi/get` | direction is outgoing | läbis |
| 14 |  | [Get] Verify minimal draft: uppercased, rsiFrom=EE, rsiTo=LV, optional fields null | `GET /ljvis/v1/erru/rsi/get` | rsiFrom is EE | läbis |
| 15 |  | [Get] Verify minimal draft: uppercased, rsiFrom=EE, rsiTo=LV, optional fields null | `GET /ljvis/v1/erru/rsi/get` | rsiTo = LV (derived from vehicleRegistrationCountry) | läbis |
| 16 |  | [Get] Verify minimal draft: uppercased, rsiFrom=EE, rsiTo=LV, optional fields null | `GET /ljvis/v1/erru/rsi/get` | vehicleRegistrationNumber uppercased | läbis |
| 17 |  | [Get] Verify minimal draft: uppercased, rsiFrom=EE, rsiTo=LV, optional fields null | `GET /ljvis/v1/erru/rsi/get` | originatingAuthority uppercased | läbis |
| 18 |  | [Get] Verify minimal draft: uppercased, rsiFrom=EE, rsiTo=LV, optional fields null | `GET /ljvis/v1/erru/rsi/get` | inspectionPassed is boolean false | läbis |
| 19 |  | [Get] Verify minimal draft: uppercased, rsiFrom=EE, rsiTo=LV, optional fields null | `GET /ljvis/v1/erru/rsi/get` | driverFirstName is null (optional block empty) | läbis |
| 20 |  | [Get] Verify minimal draft: uppercased, rsiFrom=EE, rsiTo=LV, optional fields null | `GET /ljvis/v1/erru/rsi/get` | identificationDetails is null (optional block empty) | läbis |
| 21 |  | [Create] Draft with driver block (firstName + familyName + licenceNumber) → 200 | `POST /ljvis/v1/erru/rsi/request/save` | Returns 200 | läbis |
| 22 |  | [Create] Draft with driver block (firstName + familyName + licenceNumber) → 200 | `POST /ljvis/v1/erru/rsi/request/save` | status is initiated | läbis |
| 23 |  | [Get] Verify driver block: names and licenceCountry uppercased | `GET /ljvis/v1/erru/rsi/get` | Returns 200 | läbis |
| 24 |  | [Get] Verify driver block: names and licenceCountry uppercased | `GET /ljvis/v1/erru/rsi/get` | driverFirstName uppercased | läbis |
| 25 |  | [Get] Verify driver block: names and licenceCountry uppercased | `GET /ljvis/v1/erru/rsi/get` | driverFamilyName uppercased | läbis |
| 26 |  | [Get] Verify driver block: names and licenceCountry uppercased | `GET /ljvis/v1/erru/rsi/get` | driverLicenceNumber uppercased | läbis |
| 27 |  | [Get] Verify driver block: names and licenceCountry uppercased | `GET /ljvis/v1/erru/rsi/get` | driverLicenceCountry uppercased | läbis |
| 28 |  | [Get] Verify driver block: names and licenceCountry uppercased | `GET /ljvis/v1/erru/rsi/get` | rsiTo = DE (derived from vehicleRegistrationCountry) | läbis |
| 29 |  | [Create] Draft with identificationDetails transport_undertaking + address → 200 | `POST /ljvis/v1/erru/rsi/request/save` | Returns 200 | läbis |
| 30 |  | [Create] Draft with identificationDetails transport_undertaking + address → 200 | `POST /ljvis/v1/erru/rsi/request/save` | status is initiated | läbis |
| 31 |  | [Get] Verify identificationDetails transport_undertaking stored as JSONB | `GET /ljvis/v1/erru/rsi/get` | Returns 200 | läbis |
| 32 |  | [Get] Verify identificationDetails transport_undertaking stored as JSONB | `GET /ljvis/v1/erru/rsi/get` | identificationDetails is not null | läbis |
| 33 |  | [Get] Verify identificationDetails transport_undertaking stored as JSONB | `GET /ljvis/v1/erru/rsi/get` | isVehicleHolder = transport_undertaking | läbis |
| 34 |  | [Get] Verify identificationDetails transport_undertaking stored as JSONB | `GET /ljvis/v1/erru/rsi/get` | transportUndertakingName stored | läbis |
| 35 |  | [Get] Verify identificationDetails transport_undertaking stored as JSONB | `GET /ljvis/v1/erru/rsi/get` | address.city stored | läbis |
| 36 |  | [Create] Draft with checkedItems array → 200 | `POST /ljvis/v1/erru/rsi/request/save` | Returns 200 | läbis |
| 37 |  | [Create] Draft with checkedItems array → 200 | `POST /ljvis/v1/erru/rsi/request/save` | status is initiated | läbis |
| 38 |  | [Get] Verify checkedItems round-trip: array of 2 items stored as JSONB | `GET /ljvis/v1/erru/rsi/get` | Returns 200 | läbis |
| 39 |  | [Get] Verify checkedItems round-trip: array of 2 items stored as JSONB | `GET /ljvis/v1/erru/rsi/get` | checkedItems is not null | läbis |
| 40 |  | [Get] Verify checkedItems round-trip: array of 2 items stored as JSONB | `GET /ljvis/v1/erru/rsi/get` | checkedItems has 2 items | läbis |
| 41 |  | [Get] Verify checkedItems round-trip: array of 2 items stored as JSONB | `GET /ljvis/v1/erru/rsi/get` | first item partCode = 1 (RSI_FAILED_REASON item) | läbis |
| 42 |  | [Get] Verify checkedItems round-trip: array of 2 items stored as JSONB | `GET /ljvis/v1/erru/rsi/get` | first item has 1 defect | läbis |
| 43 |  | [Get] Verify checkedItems round-trip: array of 2 items stored as JSONB | `GET /ljvis/v1/erru/rsi/get` | defect severity = OV | läbis |
| 44 |  | [Get] Verify checkedItems round-trip: array of 2 items stored as JSONB | `GET /ljvis/v1/erru/rsi/get` | second item has no defects | läbis |
| 45 |  | [Revise] Update inspectionLocation on minimal draft → version 2, businessCaseId unchanged | `POST /ljvis/v1/erru/rsi/request/save` | Returns 200 | läbis |
| 46 |  | [Revise] Update inspectionLocation on minimal draft → version 2, businessCaseId unchanged | `POST /ljvis/v1/erru/rsi/request/save` | version incremented to 2 | läbis |
| 47 |  | [Revise] Update inspectionLocation on minimal draft → version 2, businessCaseId unchanged | `POST /ljvis/v1/erru/rsi/request/save` | status still initiated | läbis |
| 48 |  | [Revise] Update inspectionLocation on minimal draft → version 2, businessCaseId unchanged | `POST /ljvis/v1/erru/rsi/request/save` | businessCaseId unchanged | läbis |
| 49 |  | [Get] Verify revision: inspectionLocation uppercased = TALLINN HARBOUR, version = 2 | `GET /ljvis/v1/erru/rsi/get` | Returns 200 | läbis |
| 50 |  | [Get] Verify revision: inspectionLocation uppercased = TALLINN HARBOUR, version = 2 | `GET /ljvis/v1/erru/rsi/get` | version is 2 after revision | läbis |
| 51 |  | [Get] Verify revision: inspectionLocation uppercased = TALLINN HARBOUR, version = 2 | `GET /ljvis/v1/erru/rsi/get` | inspectionLocation uppercased after revision | läbis |
| 52 |  | [Revise] Non-existent key (99999999) → 422 not_editable | `POST /ljvis/v1/erru/rsi/request/save` | Returns 422 | läbis |
| 53 |  | [Revise] Non-existent key (99999999) → 422 not_editable | `POST /ljvis/v1/erru/rsi/request/save` | code is not_editable | läbis |
| 54 |  | [Permissions] No-perm user on save → 403 | `POST /ljvis/v1/erru/rsi/request/save` | Forbidden without rsi.create | läbis |
| 55 |  | [Permissions] No-perm user on GET → 403 | `GET /ljvis/v1/erru/rsi/get` | Forbidden without rsi.read | läbis |
| 56 |  | [Permissions] Org Admin (rsi.read+create, no send) CAN create drafts → 200 | `POST /ljvis/v1/erru/rsi/request/save` | Org Admin can create RSI draft | läbis |
| 57 |  | [Permissions] Org Admin (rsi.read+create, no send) CAN create drafts → 200 | `POST /ljvis/v1/erru/rsi/request/save` | status is initiated | läbis |
| 58 |  | [Validation] Missing originatingAuthority → 422 required | `POST /ljvis/v1/erru/rsi/request/save` | Returns 422 | läbis |
| 59 |  | [Validation] Missing originatingAuthority → 422 required | `POST /ljvis/v1/erru/rsi/request/save` | field is originatingAuthority | läbis |
| 60 |  | [Validation] Missing originatingAuthority → 422 required | `POST /ljvis/v1/erru/rsi/request/save` | code is required | läbis |
| 61 |  | [Validation] Missing vehicleRegistrationNumber → 422 required | `POST /ljvis/v1/erru/rsi/request/save` | Returns 422 | läbis |
| 62 |  | [Validation] Missing vehicleRegistrationNumber → 422 required | `POST /ljvis/v1/erru/rsi/request/save` | field is vehicleRegistrationNumber | läbis |
| 63 |  | [Validation] Missing vehicleRegistrationNumber → 422 required | `POST /ljvis/v1/erru/rsi/request/save` | code is required | läbis |
| 64 |  | [Validation] Missing vehicleRegistrationCountry → 422 required | `POST /ljvis/v1/erru/rsi/request/save` | Returns 422 | läbis |
| 65 |  | [Validation] Missing vehicleRegistrationCountry → 422 required | `POST /ljvis/v1/erru/rsi/request/save` | field is vehicleRegistrationCountry | läbis |
| 66 |  | [Validation] Missing vehicleRegistrationCountry → 422 required | `POST /ljvis/v1/erru/rsi/request/save` | code is required | läbis |
| 67 |  | [Validation] vehicleRegistrationCountry = 'LVA' (3 chars) → 422 invalid_country_code | `POST /ljvis/v1/erru/rsi/request/save` | Returns 422 | läbis |
| 68 |  | [Validation] vehicleRegistrationCountry = 'LVA' (3 chars) → 422 invalid_country_code | `POST /ljvis/v1/erru/rsi/request/save` | field is vehicleRegistrationCountry | läbis |
| 69 |  | [Validation] vehicleRegistrationCountry = 'LVA' (3 chars) → 422 invalid_country_code | `POST /ljvis/v1/erru/rsi/request/save` | code is invalid_country_code | läbis |
| 70 |  | [Validation] Driver firstName only (no familyName) → 422 driver_block_incomplete | `POST /ljvis/v1/erru/rsi/request/save` | Returns 422 | läbis |
| 71 |  | [Validation] Driver firstName only (no familyName) → 422 driver_block_incomplete | `POST /ljvis/v1/erru/rsi/request/save` | code is driver_block_incomplete | läbis |
| 72 |  | [Validation] Missing inspectionLocation → 422 required | `POST /ljvis/v1/erru/rsi/request/save` | Returns 422 | läbis |
| 73 |  | [Validation] Missing inspectionLocation → 422 required | `POST /ljvis/v1/erru/rsi/request/save` | field is inspectionLocation | läbis |
| 74 |  | [Validation] Missing inspectionLocation → 422 required | `POST /ljvis/v1/erru/rsi/request/save` | code is required | läbis |
| 75 |  | [Validation] Missing inspectionDatetime → 422 required | `POST /ljvis/v1/erru/rsi/request/save` | Returns 422 | läbis |
| 76 |  | [Validation] Missing inspectionDatetime → 422 required | `POST /ljvis/v1/erru/rsi/request/save` | field is inspectionDatetime | läbis |
| 77 |  | [Validation] Missing inspectionDatetime → 422 required | `POST /ljvis/v1/erru/rsi/request/save` | code is required | läbis |
| 78 |  | [Validation] Missing inspectionPassed → 422 required | `POST /ljvis/v1/erru/rsi/request/save` | Returns 422 | läbis |
| 79 |  | [Validation] Missing inspectionPassed → 422 required | `POST /ljvis/v1/erru/rsi/request/save` | field is inspectionPassed | läbis |
| 80 |  | [Validation] Missing inspectionPassed → 422 required | `POST /ljvis/v1/erru/rsi/request/save` | code is required | läbis |
| 81 |  | [Validation] identificationDetails with invalid holder type → 422 holder_type_invalid | `POST /ljvis/v1/erru/rsi/request/save` | Returns 422 | läbis |
| 82 |  | [Validation] identificationDetails with invalid holder type → 422 holder_type_invalid | `POST /ljvis/v1/erru/rsi/request/save` | field is identificationDetails | läbis |
| 83 |  | [Validation] identificationDetails with invalid holder type → 422 holder_type_invalid | `POST /ljvis/v1/erru/rsi/request/save` | code is holder_type_invalid | läbis |
| 84 |  | [Validation] identificationDetails transport_undertaking without name/licence → 422 undertaking_block_incomplete | `POST /ljvis/v1/erru/rsi/request/save` | Returns 422 | läbis |
| 85 |  | [Validation] identificationDetails transport_undertaking without name/licence → 422 undertaking_block_incomplete | `POST /ljvis/v1/erru/rsi/request/save` | code is undertaking_block_incomplete | läbis |
| 86 |  | [Validation] identificationDetails owner + company without companyName → 422 company_name_required | `POST /ljvis/v1/erru/rsi/request/save` | Returns 422 | läbis |
| 87 |  | [Validation] identificationDetails owner + company without companyName → 422 company_name_required | `POST /ljvis/v1/erru/rsi/request/save` | code is company_name_required | läbis |
| 88 |  | [Validation] identificationDetails owner + natural_person without names → 422 owner_name_required | `POST /ljvis/v1/erru/rsi/request/save` | Returns 422 | läbis |
| 89 |  | [Validation] identificationDetails owner + natural_person without names → 422 owner_name_required | `POST /ljvis/v1/erru/rsi/request/save` | code is owner_name_required | läbis |
| 90 |  | [Validation] identificationDetails transport_undertaking complete name/licence but no address → 422 address_incomplete | `POST /ljvis/v1/erru/rsi/request/save` | Returns 422 | läbis |
| 91 |  | [Validation] identificationDetails transport_undertaking complete name/licence but no address → 422 address_incomplete | `POST /ljvis/v1/erru/rsi/request/save` | code is address_incomplete | läbis |
| 92 |  | [Send] Create draft for send test (LV, RSI_FAILED_REASON codes) → 200 | `POST /ljvis/v1/erru/rsi/request/save` | 200 initiated | läbis |
| 93 |  | [Send] Without rsi.send permission → 403 | `POST /ljvis/v1/erru/rsi/send` | 403 forbidden | läbis |
| 94 |  | [Send] Send draft to LV (async ACK) → 200 sent, NOT responded | `POST /ljvis/v1/erru/rsi/send` | 200 sent (async: no responseStatusCode in body) | läbis |
| 95 |  | [Get] Verify after send: status=sent, workflowId set, responseStatusCode=null | `GET /ljvis/v1/erru/rsi/get` | status=sent, workflowId set, responseStatusCode null | läbis |
| 96 |  | [Send] Re-send already-sent draft → 422 not_sendable | `POST /ljvis/v1/erru/rsi/send` | 422 not_sendable (RSI has no resend) | läbis |
| 97 |  | [Send] Missing id → 400 required | `POST /ljvis/v1/erru/rsi/send` | 400 id required | läbis |
| 98 |  | [Send] Non-existent id → 404 | `POST /ljvis/v1/erru/rsi/send` | 404 not found | läbis |
| 99 |  | [Send] Create draft for FI transport-failure test → 200 | `POST /ljvis/v1/erru/rsi/request/save` | 200 initiated | läbis |
| 100 |  | [Send] Send to FI → 502 send_failed, request transitions to error | `POST /ljvis/v1/erru/rsi/send` | 502 send_failed | läbis |
| 101 |  | [Get] Verify FI draft is in error state (no retry possible) | `GET /ljvis/v1/erru/rsi/get` | status=error, not retryable | läbis |
| 102 |  | [Send] Retry from error state → 422 not_sendable (no retry in RSI) | `POST /ljvis/v1/erru/rsi/send` | 422 not_sendable — error is terminal for RSI | läbis |
| 103 |  | [Send] Create draft with legacy TECHNICAL_CHECK codes → 200 | `POST /ljvis/v1/erru/rsi/request/save` | 200 initiated | läbis |
| 104 |  | [Send] Legacy TECHNICAL_CHECK codes → 422 invalid_checked_items, stays initiated | `POST /ljvis/v1/erru/rsi/send` | 422 invalid_checked_items | läbis |
| 105 |  | [InboundResponse] Missing workflowId → 400 | `POST /ljvis/erru/rsi/inbound-response` | 400 workflowId required | läbis |
| 106 |  | [InboundResponse] Missing responseStatusCode → 400 | `POST /ljvis/erru/rsi/inbound-response` | 400 responseStatusCode required | läbis |
| 107 |  | [InboundResponse] Unknown workflowId → 404 | `POST /ljvis/erru/rsi/inbound-response` | 404 unknown workflowId | läbis |
| 108 |  | [InboundResponse] OK response for sent draft → status=responded | `POST /ljvis/erru/rsi/inbound-response` | responded successfully | läbis |
| 109 |  | [Get] Verify after inbound-response: status=responded, responseStatusCode=OK | `GET /ljvis/v1/erru/rsi/get` | status=responded, responseStatusCode=OK | läbis |
| 110 |  | [InboundResponse] Duplicate response → 200 already_responded (not re-applied) | `POST /ljvis/erru/rsi/inbound-response` | 200 already_responded — idempotent | läbis |
| 111 |  | [Get] Verify after duplicate inbound-response: still responded, responseStatusCode unchanged | `GET /ljvis/v1/erru/rsi/get` | status still responded, responseStatusCode still OK (not overwritten) | läbis |
| 112 |  | [Inbound] EE-registered vehicle (EE-MOCK-OK, country=EE) → OK, stored received+answered | `POST /ljvis/erru/rsi/inbound-request` | OK response | läbis |
| 113 |  | [Inbound] REPLAY same technicalId → same OK answer, no duplicate stored | `POST /ljvis/erru/rsi/inbound-request` | replay: same OK answer | läbis |
| 114 |  | [Inbound] Non-EE vehicle (LV-1234, country=LV) → NotFound | `POST /ljvis/erru/rsi/inbound-request` | NotFound for non-EE vehicle | läbis |
| 115 |  | [Inbound] Missing technicalId → 400 InvalidData | `POST /ljvis/erru/rsi/inbound-request` | 400 missing technicalId | läbis |
| 116 |  | [Inbound] Missing workflowId → 400 InvalidData | `POST /ljvis/erru/rsi/inbound-request` | 400 missing workflowId | läbis |
| 117 |  | [Inbound] Missing from → 400 InvalidData | `POST /ljvis/erru/rsi/inbound-request` | 400 missing from | läbis |
| 118 |  | [Inbound] Missing businessCaseId → 400 InvalidData | `POST /ljvis/erru/rsi/inbound-request` | 400 missing businessCaseId | läbis |
| 119 |  | [Inbound] Missing vehicleRegistrationNumber → 400 InvalidData | `POST /ljvis/erru/rsi/inbound-request` | 400 missing vehicleRegistrationNumber | läbis |
| 120 |  | [Inbound] Missing vehicleRegistrationCountry → 400 InvalidData | `POST /ljvis/erru/rsi/inbound-request` | 400 missing vehicleRegistrationCountry | läbis |
| 121 |  | [List] 403 without rsi.read | `GET /ljvis/v1/erru/rsi/search` | 403 without rsi.read | läbis |
| 122 |  | [List] Basic list — returns {content, total} | `GET /ljvis/v1/erru/rsi/search` | 200 OK | läbis |
| 123 |  | [List] Basic list — returns {content, total} | `GET /ljvis/v1/erru/rsi/search` | has content array | läbis |
| 124 |  | [List] Basic list — returns {content, total} | `GET /ljvis/v1/erru/rsi/search` | has total | läbis |
| 125 |  | [List] Basic list — returns {content, total} | `GET /ljvis/v1/erru/rsi/search` | total &gt;= 0 | läbis |
| 126 |  | [List] Filter direction=outgoing — subset of total | `GET /ljvis/v1/erru/rsi/search` | 200 OK | läbis |
| 127 |  | [List] Filter direction=outgoing — subset of total | `GET /ljvis/v1/erru/rsi/search` | all rows are outgoing | läbis |
| 128 |  | [List] Filter direction=incoming — complements outgoing | `GET /ljvis/v1/erru/rsi/search` | 200 OK | läbis |
| 129 |  | [List] Filter direction=incoming — complements outgoing | `GET /ljvis/v1/erru/rsi/search` | all rows are incoming | läbis |
| 130 |  | [List] Filter direction=incoming — complements outgoing | `GET /ljvis/v1/erru/rsi/search` | outgoing + incoming = total | läbis |
| 131 |  | [List] Filter by businessCaseId — finds the sent record | `GET /ljvis/v1/erru/rsi/search` | 200 OK | läbis |
| 132 |  | [List] Filter by businessCaseId — finds the sent record | `GET /ljvis/v1/erru/rsi/search` | exactly 1 result | läbis |
| 133 |  | [List] Filter by businessCaseId — finds the sent record | `GET /ljvis/v1/erru/rsi/search` | businessCaseId matches | läbis |
| 134 |  | [List] Filter by vehicleRegistrationNumber — finds the record | `GET /ljvis/v1/erru/rsi/search` | 200 OK | läbis |
| 135 |  | [List] Filter by vehicleRegistrationNumber — finds the record | `GET /ljvis/v1/erru/rsi/search` | at least 1 result | läbis |
| 136 |  | [List] Filter by vehicleRegistrationNumber — finds the record | `GET /ljvis/v1/erru/rsi/search` | vehicleRegistrationNumber matches | läbis |
| 137 |  | [List] OR: businessCaseId + vehicleRegistrationNumber — union of both | `GET /ljvis/v1/erru/rsi/search` | 200 OK | läbis |
| 138 |  | [List] OR: businessCaseId + vehicleRegistrationNumber — union of both | `GET /ljvis/v1/erru/rsi/search` | OR gives at least 2 results | läbis |
| 139 |  | [List] OR: businessCaseId + vehicleRegistrationNumber — union of both | `GET /ljvis/v1/erru/rsi/search` | contains row matching businessCaseId | läbis |
| 140 |  | [List] OR: businessCaseId + vehicleRegistrationNumber — union of both | `GET /ljvis/v1/erru/rsi/search` | contains row matching vehicleRegistrationNumber | läbis |
| 141 |  | [List] AND: vehicleRegistrationNumber + status=sent narrows result | `GET /ljvis/v1/erru/rsi/search` | 200 OK | läbis |
| 142 |  | [List] AND: vehicleRegistrationNumber + status=sent narrows result | `GET /ljvis/v1/erru/rsi/search` | all rows are sent | läbis |
| 143 |  | [List] AND: vehicleRegistrationNumber + status=sent narrows result | `GET /ljvis/v1/erru/rsi/search` | all rows match vehicleRegistrationNumber | läbis |
| 144 |  | [List] Responded record shows responseStatusCode | `GET /ljvis/v1/erru/rsi/search` | 200 OK | läbis |
| 145 |  | [List] Responded record shows responseStatusCode | `GET /ljvis/v1/erru/rsi/search` | exactly 1 result | läbis |
| 146 |  | [List] Responded record shows responseStatusCode | `GET /ljvis/v1/erru/rsi/search` | status is responded | läbis |
| 147 |  | [List] Responded record shows responseStatusCode | `GET /ljvis/v1/erru/rsi/search` | responseStatusCode is OK | läbis |
| 148 |  | [List] Non-matching filter → 0 results | `GET /ljvis/v1/erru/rsi/search` | 200 OK | läbis |
| 149 |  | [List] Non-matching filter → 0 results | `GET /ljvis/v1/erru/rsi/search` | total = 0 | läbis |
| 150 |  | [List] Non-matching filter → 0 results | `GET /ljvis/v1/erru/rsi/search` | content is empty array | läbis |

### 14. erru-ncr

**ERRU NCR (kontrollitulemuse teade)** · testitüübid: funktsionaalne, integratsioon, töökindlus, turve · kollektsioon `tests/postman/collections/erru-ncr.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 |  | [Auth] Login — Super Admin (ncr.read+create+respond+send) | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 2 |  | [Auth] Login — Super Admin (ncr.read+create+respond+send) | `POST /ljvis/auth/dev/dev-login` | JWT received | läbis |
| 3 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 4 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | JWT received | läbis |
| 5 |  | [Guard] 403 without ncr.create on request/save | `POST /ljvis/v1/erru/ncr/request/save` | 403 without ncr.create | läbis |
| 6 |  | [Guard] 403 without ncr.respond on response/save | `POST /ljvis/v1/erru/ncr/response/save` | 403 without ncr.respond | läbis |
| 7 |  | [Guard] 403 without ncr.read on get | `GET /ljvis/v1/erru/ncr/get` | 403 without ncr.read | läbis |
| 8 |  | [Create] New outgoing draft with Fail + serious infringements -&gt; 200 initiated | `POST /ljvis/v1/erru/ncr/request/save` | 200 OK | läbis |
| 9 |  | [Create] New outgoing draft with Fail + serious infringements -&gt; 200 initiated | `POST /ljvis/v1/erru/ncr/request/save` | status initiated | läbis |
| 10 |  | [Create] New outgoing draft with Fail + serious infringements -&gt; 200 initiated | `POST /ljvis/v1/erru/ncr/request/save` | version 1 | läbis |
| 11 |  | [Create] New outgoing draft with Fail + serious infringements -&gt; 200 initiated | `POST /ljvis/v1/erru/ncr/request/save` | businessCaseId format NCR-EE-YYYY-NNNNN | läbis |
| 12 |  | [Get] Verify created draft — 1 snapshot, seriousInfringements populated | `GET /ljvis/v1/erru/ncr/get` | 200 OK | läbis |
| 13 |  | [Get] Verify created draft — 1 snapshot, seriousInfringements populated | `GET /ljvis/v1/erru/ncr/get` | 1 snapshot | läbis |
| 14 |  | [Get] Verify created draft — 1 snapshot, seriousInfringements populated | `GET /ljvis/v1/erru/ncr/get` | direction outgoing | läbis |
| 15 |  | [Get] Verify created draft — 1 snapshot, seriousInfringements populated | `GET /ljvis/v1/erru/ncr/get` | checkResult Fail | läbis |
| 16 |  | [Get] Verify created draft — 1 snapshot, seriousInfringements populated | `GET /ljvis/v1/erru/ncr/get` | seriousInfringements has 1 entry | läbis |
| 17 |  | [Get] Verify created draft — 1 snapshot, seriousInfringements populated | `GET /ljvis/v1/erru/ncr/get` | penaltiesRequested has 2 entries | läbis |
| 18 |  | [Get] Verify created draft — 1 snapshot, seriousInfringements populated | `GET /ljvis/v1/erru/ncr/get` | minorInfringement populated | läbis |
| 19 |  | [Revise] Update transportUndertakingName -&gt; 200 version 2, still initiated | `POST /ljvis/v1/erru/ncr/request/save` | 200 OK | läbis |
| 20 |  | [Revise] Update transportUndertakingName -&gt; 200 version 2, still initiated | `POST /ljvis/v1/erru/ncr/request/save` | status still initiated | läbis |
| 21 |  | [Revise] Update transportUndertakingName -&gt; 200 version 2, still initiated | `POST /ljvis/v1/erru/ncr/request/save` | version 2 | läbis |
| 22 |  | [Revise] Update transportUndertakingName -&gt; 200 version 2, still initiated | `POST /ljvis/v1/erru/ncr/request/save` | businessCaseId unchanged | läbis |
| 23 |  | [Get] Verify revision — 2 snapshots, name updated on latest | `GET /ljvis/v1/erru/ncr/get` | 200 OK | läbis |
| 24 |  | [Get] Verify revision — 2 snapshots, name updated on latest | `GET /ljvis/v1/erru/ncr/get` | 2 snapshots | läbis |
| 25 |  | [Get] Verify revision — 2 snapshots, name updated on latest | `GET /ljvis/v1/erru/ncr/get` | latest name updated | läbis |
| 26 |  | [Get] Verify revision — 2 snapshots, name updated on latest | `GET /ljvis/v1/erru/ncr/get` | first snapshot preserved | läbis |
| 27 |  | [Revise] checkResult=Pass clears minorInfringement + seriousInfringements | `POST /ljvis/v1/erru/ncr/request/save` | 200 OK | läbis |
| 28 |  | [Revise] checkResult=Pass clears minorInfringement + seriousInfringements | `POST /ljvis/v1/erru/ncr/request/save` | version 3 | läbis |
| 29 |  | [Get] Verify Pass clears infringement data (not just hidden — actually cleared) | `GET /ljvis/v1/erru/ncr/get` | 200 OK | läbis |
| 30 |  | [Get] Verify Pass clears infringement data (not just hidden — actually cleared) | `GET /ljvis/v1/erru/ncr/get` | checkResult Pass | läbis |
| 31 |  | [Get] Verify Pass clears infringement data (not just hidden — actually cleared) | `GET /ljvis/v1/erru/ncr/get` | minorInfringement cleared to null | läbis |
| 32 |  | [Get] Verify Pass clears infringement data (not just hidden — actually cleared) | `GET /ljvis/v1/erru/ncr/get` | seriousInfringements cleared to empty array | läbis |
| 33 |  | [Validate] 422 infringement_incomplete — missing infringementType | `POST /ljvis/v1/erru/ncr/request/save` | 422 | läbis |
| 34 |  | [Validate] 422 infringement_incomplete — missing infringementType | `POST /ljvis/v1/erru/ncr/request/save` | code infringement_incomplete | läbis |
| 35 |  | [Validate] 422 infringement_incomplete — missing dateOfInfringement | `POST /ljvis/v1/erru/ncr/request/save` | 422 | läbis |
| 36 |  | [Validate] 422 infringement_incomplete — missing dateOfInfringement | `POST /ljvis/v1/erru/ncr/request/save` | code infringement_incomplete | läbis |
| 37 |  | [Validate] 422 infringement_incomplete — missing detectionCheckDate | `POST /ljvis/v1/erru/ncr/request/save` | 422 | läbis |
| 38 |  | [Validate] 422 infringement_incomplete — missing detectionCheckDate | `POST /ljvis/v1/erru/ncr/request/save` | code infringement_incomplete | läbis |
| 39 |  | [Revise] 422 not_editable when trying to revise a bogus/non-initiated case | `POST /ljvis/v1/erru/ncr/request/save` | 422 | läbis |
| 40 |  | [Revise] 422 not_editable when trying to revise a bogus/non-initiated case | `POST /ljvis/v1/erru/ncr/request/save` | code not_editable | läbis |
| 41 |  | [Revise] 422 not_editable when trying to revise an already-Pass outgoing case a 2nd time is fine (still initiated) — sanity: revising the same case works again | `POST /ljvis/v1/erru/ncr/request/save` | 200 OK | läbis |
| 42 |  | [Revise] 422 not_editable when trying to revise an already-Pass outgoing case a 2nd time is fine (still initiated) — sanity: revising the same case works again | `POST /ljvis/v1/erru/ncr/request/save` | version 4 | läbis |
| 43 |  | [Revise] 422 not_editable when trying to revise an already-Pass outgoing case a 2nd time is fine (still initiated) — sanity: revising the same case works again | `POST /ljvis/v1/erru/ncr/request/save` | still initiated | läbis |
| 44 |  | [Get] 404 for nonexistent case | `GET /ljvis/v1/erru/ncr/get` | 404 | läbis |
| 45 |  | [Inbound fixture] Get incoming case — auto-transitions received -&gt; viewed on first open | `GET /ljvis/v1/erru/ncr/get` | 200 OK | läbis |
| 46 |  | [Inbound fixture] Get incoming case — auto-transitions received -&gt; viewed on first open | `GET /ljvis/v1/erru/ncr/get` | status viewed after first open | läbis |
| 47 |  | [Inbound fixture] Get incoming case — auto-transitions received -&gt; viewed on first open | `GET /ljvis/v1/erru/ncr/get` | direction incoming | läbis |
| 48 |  | [Inbound fixture] Get incoming case — auto-transitions received -&gt; viewed on first open | `GET /ljvis/v1/erru/ncr/get` | 2 requested penalties present | läbis |
| 49 |  | [Inbound fixture] Re-open does NOT create a 2nd auto-transition (idempotent) | `GET /ljvis/v1/erru/ncr/get` | 200 OK | läbis |
| 50 |  | [Inbound fixture] Re-open does NOT create a 2nd auto-transition (idempotent) | `GET /ljvis/v1/erru/ncr/get` | still exactly 2 snapshots (received + viewed) | läbis |
| 51 |  | [Inbound fixture] Re-open does NOT create a 2nd auto-transition (idempotent) | `GET /ljvis/v1/erru/ncr/get` | status still viewed | läbis |
| 52 |  | [Response] 422 penalty_coverage_incomplete — missing requested id=2 | `POST /ljvis/v1/erru/ncr/response/save` | 422 | läbis |
| 53 |  | [Response] 422 penalty_coverage_incomplete — missing requested id=2 | `POST /ljvis/v1/erru/ncr/response/save` | code penalty_coverage_incomplete | läbis |
| 54 |  | [Response] 422 penalty_coverage_incomplete — duplicate id=1, missing id=2 | `POST /ljvis/v1/erru/ncr/response/save` | 422 | läbis |
| 55 |  | [Response] 422 penalty_coverage_incomplete — duplicate id=1, missing id=2 | `POST /ljvis/v1/erru/ncr/response/save` | code penalty_coverage_incomplete | läbis |
| 56 |  | [Response] 422 penalty_coverage_incomplete — extra id=3 not in requested set | `POST /ljvis/v1/erru/ncr/response/save` | 422 | läbis |
| 57 |  | [Response] 422 penalty_coverage_incomplete — extra id=3 not in requested set | `POST /ljvis/v1/erru/ncr/response/save` | code penalty_coverage_incomplete | läbis |
| 58 |  | [Response] 422 imposed_penalty_type_missing — isImposed=true but penaltyTypeImposed null (full coverage) | `POST /ljvis/v1/erru/ncr/response/save` | 422 | läbis |
| 59 |  | [Response] 422 imposed_penalty_type_missing — isImposed=true but penaltyTypeImposed null (full coverage) | `POST /ljvis/v1/erru/ncr/response/save` | code imposed_penalty_type_missing | läbis |
| 60 |  | [Response] 422 imposed_penalty_type_missing — isImposed=true but penaltyTypeImposed null (full coverage) | `POST /ljvis/v1/erru/ncr/response/save` | field is null | läbis |
| 61 |  | [Response] 200 answer_drafted — full coverage (id=1 imposed, id=2 not imposed) | `POST /ljvis/v1/erru/ncr/response/save` | 200 OK | läbis |
| 62 |  | [Response] 200 answer_drafted — full coverage (id=1 imposed, id=2 not imposed) | `POST /ljvis/v1/erru/ncr/response/save` | status answer_drafted | läbis |
| 63 |  | [Get] Verify response saved — isImposed=false strips penaltyTypeImposed | `GET /ljvis/v1/erru/ncr/get` | 200 OK | läbis |
| 64 |  | [Get] Verify response saved — isImposed=false strips penaltyTypeImposed | `GET /ljvis/v1/erru/ncr/get` | status answer_drafted | läbis |
| 65 |  | [Get] Verify response saved — isImposed=false strips penaltyTypeImposed | `GET /ljvis/v1/erru/ncr/get` | 2 penalty entries | läbis |
| 66 |  | [Get] Verify response saved — isImposed=false strips penaltyTypeImposed | `GET /ljvis/v1/erru/ncr/get` | id=1 isImposed true, type kept | läbis |
| 67 |  | [Get] Verify response saved — isImposed=false strips penaltyTypeImposed | `GET /ljvis/v1/erru/ncr/get` | id=2 isImposed false, type stripped to null | läbis |
| 68 |  | [Get] Verify response saved — isImposed=false strips penaltyTypeImposed | `GET /ljvis/v1/erru/ncr/get` | id=2 reason kept even when not imposed | läbis |
| 69 |  | [Get] Verify response saved — isImposed=false strips penaltyTypeImposed | `GET /ljvis/v1/erru/ncr/get` | responseCommunityLicenceStatus saved | läbis |
| 70 |  | [Response] Re-save (revise) response draft still requires full coverage -&gt; 200 | `POST /ljvis/v1/erru/ncr/response/save` | 200 OK | läbis |
| 71 |  | [Response] Re-save (revise) response draft still requires full coverage -&gt; 200 | `POST /ljvis/v1/erru/ncr/response/save` | status still answer_drafted | läbis |
| 72 |  | [Response] 404 for nonexistent case | `POST /ljvis/v1/erru/ncr/response/save` | 404 | läbis |
| 73 |  | [Response] 422 not_editable — cannot respond to the OUTGOING case created earlier | `POST /ljvis/v1/erru/ncr/response/save` | 422 | läbis |
| 74 |  | [Response] 422 not_editable — cannot respond to the OUTGOING case created earlier | `POST /ljvis/v1/erru/ncr/response/save` | code not_editable | läbis |
| 75 |  | [Build] 403 without ncr.create | `POST /ljvis/v1/erru/ncr/request/build` | 403 without ncr.create | läbis |
| 76 |  | [Build] M1 vehicle excludes 302 (sõidukeeld) from draft | `POST /ljvis/v1/erru/ncr/request/build` | 200 OK | läbis |
| 77 |  | [Build] M1 vehicle excludes 302 (sõidukeeld) from draft | `POST /ljvis/v1/erru/ncr/request/build` | status initiated | läbis |
| 78 |  | [Get] Verify M1 draft — checkResult=Fail, only 105 present (302 excluded) | `GET /ljvis/v1/erru/ncr/get` | 200 OK | läbis |
| 79 |  | [Get] Verify M1 draft — checkResult=Fail, only 105 present (302 excluded) | `GET /ljvis/v1/erru/ncr/get` | checkResult Fail | läbis |
| 80 |  | [Get] Verify M1 draft — checkResult=Fail, only 105 present (302 excluded) | `GET /ljvis/v1/erru/ncr/get` | exactly 1 infringement | läbis |
| 81 |  | [Get] Verify M1 draft — checkResult=Fail, only 105 present (302 excluded) | `GET /ljvis/v1/erru/ncr/get` | only 105 present, 302 excluded | läbis |
| 82 |  | [Get] Verify M1 draft — checkResult=Fail, only 105 present (302 excluded) | `GET /ljvis/v1/erru/ncr/get` | transportUndertakingName from compound_form | läbis |
| 83 |  | [Build] N2 vehicle keeps 302 (sõidukeeld) in draft | `POST /ljvis/v1/erru/ncr/request/build` | 200 OK | läbis |
| 84 |  | [Get] Verify N2 draft — checkResult=Fail, both 302 and 105 present | `GET /ljvis/v1/erru/ncr/get` | 200 OK | läbis |
| 85 |  | [Get] Verify N2 draft — checkResult=Fail, both 302 and 105 present | `GET /ljvis/v1/erru/ncr/get` | checkResult Fail | läbis |
| 86 |  | [Get] Verify N2 draft — checkResult=Fail, both 302 and 105 present | `GET /ljvis/v1/erru/ncr/get` | 2 infringements | läbis |
| 87 |  | [Get] Verify N2 draft — checkResult=Fail, both 302 and 105 present | `GET /ljvis/v1/erru/ncr/get` | 302 present for N2 | läbis |
| 88 |  | [Get] Verify N2 draft — checkResult=Fail, both 302 and 105 present | `GET /ljvis/v1/erru/ncr/get` | 105 present for N2 | läbis |
| 89 |  | [Get] Verify M1 draft — checkDate/licence/vehicle fields + exactly one snapshot (T1/T4) | `GET /ljvis/v1/erru/ncr/get` | 200 OK | läbis |
| 90 |  | [Get] Verify M1 draft — checkDate/licence/vehicle fields + exactly one snapshot (T1/T4) | `GET /ljvis/v1/erru/ncr/get` | exactly one snapshot (T4) | läbis |
| 91 |  | [Get] Verify M1 draft — checkDate/licence/vehicle fields + exactly one snapshot (T1/T4) | `GET /ljvis/v1/erru/ncr/get` | version 1, outgoing, initiated (T4) | läbis |
| 92 |  | [Get] Verify M1 draft — checkDate/licence/vehicle fields + exactly one snapshot (T1/T4) | `GET /ljvis/v1/erru/ncr/get` | checkDate derived from compound_form.control_date (T1) | läbis |
| 93 |  | [Get] Verify M1 draft — checkDate/licence/vehicle fields + exactly one snapshot (T1/T4) | `GET /ljvis/v1/erru/ncr/get` | communityLicenceNumber from compound_form (T1) | läbis |
| 94 |  | [Get] Verify M1 draft — checkDate/licence/vehicle fields + exactly one snapshot (T1/T4) | `GET /ljvis/v1/erru/ncr/get` | vehicleRegistrationNumber from compound_form (T1) | läbis |
| 95 |  | [Get] Verify M1 draft — checkDate/licence/vehicle fields + exactly one snapshot (T1/T4) | `GET /ljvis/v1/erru/ncr/get` | vehicleRegistrationCountry from compound_form (T1) | läbis |
| 96 |  | [Setup] Create compound form for Pass NCR build (T2) | `POST /ljvis/v1/control-forms/compound-form/edit/save` | 200 OK | läbis |
| 97 |  | [Setup] Create SP driver form (MI only) for Pass NCR build (T2) | `POST /ljvis/v1/control-forms/drive-rest-form/driver/edit/save` | 200 OK | läbis |
| 98 |  | [Build] Pass case (no MSI/VSI/SI) -&gt; checkResult=Pass, no infringements (T2) | `POST /ljvis/v1/erru/ncr/request/build` | 200 OK | läbis |
| 99 |  | [Build] Pass case (no MSI/VSI/SI) -&gt; checkResult=Pass, no infringements (T2) | `POST /ljvis/v1/erru/ncr/request/build` | status initiated | läbis |
| 100 |  | [Get] Verify Pass draft — checkResult=Pass, seriousInfringements empty, checkDate set (T2) | `GET /ljvis/v1/erru/ncr/get` | 200 OK | läbis |
| 101 |  | [Get] Verify Pass draft — checkResult=Pass, seriousInfringements empty, checkDate set (T2) | `GET /ljvis/v1/erru/ncr/get` | checkResult Pass | läbis |
| 102 |  | [Get] Verify Pass draft — checkResult=Pass, seriousInfringements empty, checkDate set (T2) | `GET /ljvis/v1/erru/ncr/get` | no serious infringements | läbis |
| 103 |  | [Get] Verify Pass draft — checkResult=Pass, seriousInfringements empty, checkDate set (T2) | `GET /ljvis/v1/erru/ncr/get` | checkDate still derived even on Pass | läbis |
| 104 |  | [Get] Verify Pass draft — checkResult=Pass, seriousInfringements empty, checkDate set (T2) | `GET /ljvis/v1/erru/ncr/get` | transportUndertakingName from compound_form | läbis |
| 105 |  | [Build] 422 invalid input — missing spFormKey | `POST /ljvis/v1/erru/ncr/request/build` | 422 | läbis |
| 106 |  | [Build] 422 invalid input — missing spFormKey | `POST /ljvis/v1/erru/ncr/request/build` | code required | läbis |
| 107 |  | [Build] 404 when sp sub-form not found | `POST /ljvis/v1/erru/ncr/request/build` | 404 | läbis |
| 108 |  | [Send] 403 without ncr.send | `POST /ljvis/v1/erru/ncr/send` | 403 without ncr.send | läbis |
| 109 |  | [Send] LV (default scenario) -&gt; ack OK -&gt; acknowledged, 3 snapshots | `POST /ljvis/v1/erru/ncr/send` | 200 OK | läbis |
| 110 |  | [Send] LV (default scenario) -&gt; ack OK -&gt; acknowledged, 3 snapshots | `POST /ljvis/v1/erru/ncr/send` | status acknowledged | läbis |
| 111 |  | [Send] LV (default scenario) -&gt; ack OK -&gt; acknowledged, 3 snapshots | `POST /ljvis/v1/erru/ncr/send` | ackStatusCode OK | läbis |
| 112 |  | [Send] LV (default scenario) -&gt; ack OK -&gt; acknowledged, 3 snapshots | `POST /ljvis/v1/erru/ncr/send` | workflowId present | läbis |
| 113 |  | [Get] Verify sent+acknowledged — 3 snapshots (initiated, sent, acknowledged) | `GET /ljvis/v1/erru/ncr/get` | 200 OK | läbis |
| 114 |  | [Get] Verify sent+acknowledged — 3 snapshots (initiated, sent, acknowledged) | `GET /ljvis/v1/erru/ncr/get` | 3 snapshots | läbis |
| 115 |  | [Get] Verify sent+acknowledged — 3 snapshots (initiated, sent, acknowledged) | `GET /ljvis/v1/erru/ncr/get` | statuses in order | läbis |
| 116 |  | [Get] Verify sent+acknowledged — 3 snapshots (initiated, sent, acknowledged) | `GET /ljvis/v1/erru/ncr/get` | last ackStatusCode OK | läbis |
| 117 |  | [Send] Not sendable — already acknowledged case | `POST /ljvis/v1/erru/ncr/send` | 422 | läbis |
| 118 |  | [Send] Not sendable — already acknowledged case | `POST /ljvis/v1/erru/ncr/send` | code not_sendable | läbis |
| 119 |  | [Create] Draft targeting FI for transport-failure scenario | `POST /ljvis/v1/erru/ncr/request/save` | 200 OK | läbis |
| 120 |  | [Send] FI transport failure -&gt; 502, status=error | `POST /ljvis/v1/erru/ncr/send` | 502 | läbis |
| 121 |  | [Send] FI transport failure -&gt; 502, status=error | `POST /ljvis/v1/erru/ncr/send` | code send_failed | läbis |
| 122 |  | [Get] Verify FI failure — status=error | `GET /ljvis/v1/erru/ncr/get` | 200 OK | läbis |
| 123 |  | [Get] Verify FI failure — status=error | `GET /ljvis/v1/erru/ncr/get` | status error | läbis |
| 124 |  | [Get] Verify FI failure — status=error | `GET /ljvis/v1/erru/ncr/get` | errorMessage present | läbis |
| 125 |  | [Send] Retry from error (still FI, fails again) -&gt; 502, status stays error | `POST /ljvis/v1/erru/ncr/send` | 502 | läbis |
| 126 |  | [Create] Draft targeting NO for negative-ack scenario | `POST /ljvis/v1/erru/ncr/request/save` | 200 OK | läbis |
| 127 |  | [Send] NO negative ack (Timeout) -&gt; 502, status=error | `POST /ljvis/v1/erru/ncr/send` | 502 | läbis |
| 128 |  | [Get] Verify NO negative ack — status=error, sent snapshot recorded before error | `GET /ljvis/v1/erru/ncr/get` | 200 OK | läbis |
| 129 |  | [Get] Verify NO negative ack — status=error, sent snapshot recorded before error | `GET /ljvis/v1/erru/ncr/get` | has a sent snapshot | läbis |
| 130 |  | [Get] Verify NO negative ack — status=error, sent snapshot recorded before error | `GET /ljvis/v1/erru/ncr/get` | last status error | läbis |
| 131 |  | [InboundResponse] Unknown workflowId -&gt; 404 | `POST /ljvis/erru/ncr/inbound-response` | 404 | läbis |
| 132 |  | [InboundResponse] Missing workflowId -&gt; 400 | `POST /ljvis/erru/ncr/inbound-response` | 400 | läbis |
| 133 |  | [InboundResponse] Correlated OK response -&gt; responded, carries transport undertaking snapshot | `POST /ljvis/erru/ncr/inbound-response` | 200 OK | läbis |
| 134 |  | [InboundResponse] Correlated OK response -&gt; responded, carries transport undertaking snapshot | `POST /ljvis/erru/ncr/inbound-response` | status responded | läbis |
| 135 |  | [Get] Verify responded — 4 snapshots, response content stored | `GET /ljvis/v1/erru/ncr/get` | 200 OK | läbis |
| 136 |  | [Get] Verify responded — 4 snapshots, response content stored | `GET /ljvis/v1/erru/ncr/get` | 4 snapshots | läbis |
| 137 |  | [Get] Verify responded — 4 snapshots, response content stored | `GET /ljvis/v1/erru/ncr/get` | status responded | läbis |
| 138 |  | [Get] Verify responded — 4 snapshots, response content stored | `GET /ljvis/v1/erru/ncr/get` | respondingAuthority stored | läbis |
| 139 |  | [Get] Verify responded — 4 snapshots, response content stored | `GET /ljvis/v1/erru/ncr/get` | responseCommunityLicenceStatus stored | läbis |
| 140 |  | [Get] Verify responded — 4 snapshots, response content stored | `GET /ljvis/v1/erru/ncr/get` | responseNumberOfVehicles stored | läbis |
| 141 |  | [InboundResponse] Duplicate response -&gt; already_responded, no new snapshot | `POST /ljvis/erru/ncr/inbound-response` | 200 OK | läbis |
| 142 |  | [InboundResponse] Duplicate response -&gt; already_responded, no new snapshot | `POST /ljvis/erru/ncr/inbound-response` | status already_responded | läbis |
| 143 |  | [Get] Verify duplicate response did not create a 5th snapshot | `GET /ljvis/v1/erru/ncr/get` | 200 OK | läbis |
| 144 |  | [Get] Verify duplicate response did not create a 5th snapshot | `GET /ljvis/v1/erru/ncr/get` | still 4 snapshots | läbis |
| 145 |  | [Inbound] Missing technicalId -&gt; InvalidData | `POST /ljvis/erru/ncr/inbound-request` | 400 InvalidData | läbis |
| 146 |  | [Inbound] Missing technicalId -&gt; InvalidData | `POST /ljvis/erru/ncr/inbound-request` | statusCode InvalidData | läbis |
| 147 |  | [Inbound] New NCR request from DE -&gt; stored as received, ack OK | `POST /ljvis/erru/ncr/inbound-request` | 200 OK | läbis |
| 148 |  | [Inbound] New NCR request from DE -&gt; stored as received, ack OK | `POST /ljvis/erru/ncr/inbound-request` | statusCode OK | läbis |
| 149 |  | [Inbound] checkResult=Fail creates exactly one ncr_violation notification | `POST /ljvis/notification/list_notifications` | 200 OK | läbis |
| 150 |  | [Inbound] checkResult=Fail creates exactly one ncr_violation notification | `POST /ljvis/notification/list_notifications` | exactly one ncr_violation notification for the Fail result (checkViolation fix, not the unreachable WITH_INFRINGEMENT condition) | läbis |
| 151 |  | [Inbound] REPLAY same technicalId -&gt; same ack, no duplicate stored | `POST /ljvis/erru/ncr/inbound-request` | 200 OK | läbis |
| 152 |  | [Inbound] REPLAY same technicalId -&gt; same ack, no duplicate stored | `POST /ljvis/erru/ncr/inbound-request` | statusCode OK (replayed) | läbis |
| 153 |  | [Get] Verify DE inbound — dedup worked (received + auto-viewed on this open, not 3+) | `GET /ljvis/v1/erru/ncr/get` | 200 OK | läbis |
| 154 |  | [Get] Verify DE inbound — dedup worked (received + auto-viewed on this open, not 3+) | `GET /ljvis/v1/erru/ncr/get` | exactly 2 snapshots (received + auto-viewed by this GET, dedup prevented a 3rd) | läbis |
| 155 |  | [Get] Verify DE inbound — dedup worked (received + auto-viewed on this open, not 3+) | `GET /ljvis/v1/erru/ncr/get` | first snapshot status received | läbis |
| 156 |  | [Get] Verify DE inbound — dedup worked (received + auto-viewed on this open, not 3+) | `GET /ljvis/v1/erru/ncr/get` | last snapshot status viewed (auto-transition) | läbis |
| 157 |  | [Get] Verify DE inbound — dedup worked (received + auto-viewed on this open, not 3+) | `GET /ljvis/v1/erru/ncr/get` | transportUndertakingName stored | läbis |
| 158 |  | [Get] Verify DE inbound — dedup worked (received + auto-viewed on this open, not 3+) | `GET /ljvis/v1/erru/ncr/get` | seriousInfringements stored | läbis |
| 159 |  | [ResponseSend] 403 without ncr.send | `POST /ljvis/v1/erru/ncr/response-send` | 403 without ncr.send | läbis |
| 160 |  | [ResponseSend] Success — LV-NCR-2026-TEST0001 answer_drafted -&gt; answered | `POST /ljvis/v1/erru/ncr/response-send` | 200 OK | läbis |
| 161 |  | [ResponseSend] Success — LV-NCR-2026-TEST0001 answer_drafted -&gt; answered | `POST /ljvis/v1/erru/ncr/response-send` | status answered | läbis |
| 162 |  | [ResponseSend] Not sendable — DE-NCR-2026-INBOUND1 still received (never drafted) | `POST /ljvis/v1/erru/ncr/response-send` | 422 | läbis |
| 163 |  | [ResponseSend] Not sendable — DE-NCR-2026-INBOUND1 still received (never drafted) | `POST /ljvis/v1/erru/ncr/response-send` | code not_sendable | läbis |
| 164 |  | [ResponseSend] 404 for nonexistent case | `POST /ljvis/v1/erru/ncr/response-send` | 404 | läbis |
| 165 |  | [List] 403 without ncr.list | `GET /ljvis/v1/erru/ncr/list/search` | 403 without ncr.list | läbis |
| 166 |  | [List] Basic list — returns {content, total} | `GET /ljvis/v1/erru/ncr/list/search` | 200 OK | läbis |
| 167 |  | [List] Basic list — returns {content, total} | `GET /ljvis/v1/erru/ncr/list/search` | has content array | läbis |
| 168 |  | [List] Basic list — returns {content, total} | `GET /ljvis/v1/erru/ncr/list/search` | has total | läbis |
| 169 |  | [List] Basic list — returns {content, total} | `GET /ljvis/v1/erru/ncr/list/search` | total &gt;= 6 (cases created by earlier stages) | läbis |
| 170 |  | [List] Filter direction=outgoing — all rows outgoing | `GET /ljvis/v1/erru/ncr/list/search` | 200 OK | läbis |
| 171 |  | [List] Filter direction=outgoing — all rows outgoing | `GET /ljvis/v1/erru/ncr/list/search` | all rows outgoing | läbis |
| 172 |  | [List] Filter direction=incoming — complements outgoing | `GET /ljvis/v1/erru/ncr/list/search` | 200 OK | läbis |
| 173 |  | [List] Filter direction=incoming — complements outgoing | `GET /ljvis/v1/erru/ncr/list/search` | all rows incoming | läbis |
| 174 |  | [List] Filter direction=incoming — complements outgoing | `GET /ljvis/v1/erru/ncr/list/search` | outgoing + incoming = grand total | läbis |
| 175 |  | [List] Filter businessCaseId (M1 draft) — exactly 1 result, hasInfringement=true | `GET /ljvis/v1/erru/ncr/list/search` | 200 OK | läbis |
| 176 |  | [List] Filter businessCaseId (M1 draft) — exactly 1 result, hasInfringement=true | `GET /ljvis/v1/erru/ncr/list/search` | exactly 1 result | läbis |
| 177 |  | [List] Filter businessCaseId (M1 draft) — exactly 1 result, hasInfringement=true | `GET /ljvis/v1/erru/ncr/list/search` | hasInfringement true | läbis |
| 178 |  | [List] Filter businessCaseId (M1 draft) — exactly 1 result, hasInfringement=true | `GET /ljvis/v1/erru/ncr/list/search` | transportUndertakingName present | läbis |
| 179 |  | [List] Filter businessCaseId (FI Pass draft) — hasInfringement=false | `GET /ljvis/v1/erru/ncr/list/search` | 200 OK | läbis |
| 180 |  | [List] Filter businessCaseId (FI Pass draft) — hasInfringement=false | `GET /ljvis/v1/erru/ncr/list/search` | exactly 1 result | läbis |
| 181 |  | [List] Filter businessCaseId (FI Pass draft) — hasInfringement=false | `GET /ljvis/v1/erru/ncr/list/search` | hasInfringement false | läbis |
| 182 |  | [List] Filter businessCaseId (FI Pass draft) — hasInfringement=false | `GET /ljvis/v1/erru/ncr/list/search` | status error | läbis |
| 183 |  | [List] Filter status=error — AND-combined with direction=outgoing | `GET /ljvis/v1/erru/ncr/list/search` | 200 OK | läbis |
| 184 |  | [List] Filter status=error — AND-combined with direction=outgoing | `GET /ljvis/v1/erru/ncr/list/search` | at least 2 error cases (FI + NO) | läbis |
| 185 |  | [List] Filter status=error — AND-combined with direction=outgoing | `GET /ljvis/v1/erru/ncr/list/search` | all rows status=error and outgoing | läbis |
| 186 |  | [List] Non-matching filter -&gt; 0 results | `GET /ljvis/v1/erru/ncr/list/search` | 200 OK | läbis |
| 187 |  | [List] Non-matching filter -&gt; 0 results | `GET /ljvis/v1/erru/ncr/list/search` | total = 0 | läbis |
| 188 |  | [List] Non-matching filter -&gt; 0 results | `GET /ljvis/v1/erru/ncr/list/search` | content is empty array | läbis |
| 189 |  | [List] Sort by business_case_id asc | `GET /ljvis/v1/erru/ncr/list/search` | 200 OK | läbis |
| 190 |  | [List] Sort by business_case_id asc | `GET /ljvis/v1/erru/ncr/list/search` | rows sorted by businessCaseId ascending | läbis |

### 15. erru-nu

**ERRU NU (sobimatusteade)** · testitüübid: funktsionaalne, integratsioon, töökindlus, turve · kollektsioon `tests/postman/collections/erru-nu.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 |  | [Auth] Login — Super Admin (nu.read+create+send) | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 2 |  | [Auth] Login — Super Admin (nu.read+create+send) | `POST /ljvis/auth/dev/dev-login` | JWT received | läbis |
| 3 |  | [Auth] Login — Org Admin (nu.read+create, NO send) | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 4 |  | [Auth] Login — Org Admin (nu.read+create, NO send) | `POST /ljvis/auth/dev/dev-login` | JWT received | läbis |
| 5 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 6 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | JWT received | läbis |
| 7 |  | [Setup] Create good-repute UNFIT declaration (NU source) | `POST /ljvis/v1/control-forms/good-repute/edit/save` | Returns 200 | läbis |
| 8 |  | [Setup] Confirm good-repute declaration | `POST /ljvis/v1/control-forms/good-repute/edit/confirm` | Returns 200 | läbis |
| 9 |  | [Setup] Publish good-repute declaration | `POST /ljvis/v1/control-forms/good-repute/edit/publish` | Returns 200 | läbis |
| 10 |  | [Setup] FIT declaration (must be excluded from NU source search / rejected as source) — create | `POST /ljvis/v1/control-forms/good-repute/edit/save` | Returns 200 | läbis |
| 11 |  | [Setup] FIT declaration (must be excluded from NU source search / rejected as source) — confirm | `POST /ljvis/v1/control-forms/good-repute/edit/confirm` | Returns 200 | läbis |
| 12 |  | [Setup] FIT declaration (must be excluded from NU source search / rejected as source) — publish | `POST /ljvis/v1/control-forms/good-repute/edit/publish` | Returns 200 | läbis |
| 13 |  | [Source] Search by name+DOB finds the published/unfit declaration | `GET /ljvis/v1/erru/nu/source/search` | Returns 200 | läbis |
| 14 |  | [Source] Search by name+DOB finds the published/unfit declaration | `GET /ljvis/v1/erru/nu/source/search` | finds at least one candidate | läbis |
| 15 |  | [Source] Search by name+DOB finds the published/unfit declaration | `GET /ljvis/v1/erru/nu/source/search` | candidate matches source id | läbis |
| 16 |  | [Source] Search with no match returns empty content | `GET /ljvis/v1/erru/nu/source/search` | Returns 200 | läbis |
| 17 |  | [Source] Search with no match returns empty content | `GET /ljvis/v1/erru/nu/source/search` | empty content | läbis |
| 18 |  | [Source] Search by certificate number alone finds the declaration (UC-16) | `GET /ljvis/v1/erru/nu/source/search` | Returns 200 | läbis |
| 19 |  | [Source] Search by certificate number alone finds the declaration (UC-16) | `GET /ljvis/v1/erru/nu/source/search` | finds the source by certificate number alone | läbis |
| 20 |  | [Source] Search excludes a FIT declaration even with matching name+DOB (UC-19) | `GET /ljvis/v1/erru/nu/source/search` | Returns 200 | läbis |
| 21 |  | [Source] Search excludes a FIT declaration even with matching name+DOB (UC-19) | `GET /ljvis/v1/erru/nu/source/search` | FIT declaration is not returned as a usable source | läbis |
| 22 |  | [Source] Get by key returns eligible declaration | `GET /ljvis/v1/erru/nu/source/get` | Returns 200 | läbis |
| 23 |  | [Source] Get by key returns eligible declaration | `GET /ljvis/v1/erru/nu/source/get` | status is published | läbis |
| 24 |  | [Source] Get by key returns eligible declaration | `GET /ljvis/v1/erru/nu/source/get` | fitnessStatus is unfit | läbis |
| 25 |  | [Source] Get non-existent key → 404 | `GET /ljvis/v1/erru/nu/source/get` | Returns 404 | läbis |
| 26 |  | [Source] Get on a published-but-FIT declaration → 409 source_not_eligible (UC-13) | `GET /ljvis/v1/erru/nu/source/get` | Returns 409 | läbis |
| 27 |  | [Source] Get on a published-but-FIT declaration → 409 source_not_eligible (UC-13) | `GET /ljvis/v1/erru/nu/source/get` | code source_not_eligible | läbis |
| 28 |  | [Permissions] Source search without nu.create → 403 | `GET /ljvis/v1/erru/nu/source/search` | Returns 403 | läbis |
| 29 |  | [Create] Save without sourceGoodReputeFormKey → 422 required | `POST /ljvis/v1/erru/nu/request/save` | Returns 422 | läbis |
| 30 |  | [Create] Save without sourceGoodReputeFormKey → 422 required | `POST /ljvis/v1/erru/nu/request/save` | code required | läbis |
| 31 |  | [Create] Save without originatingAuthority → 422 required (UC-22) | `POST /ljvis/v1/erru/nu/request/save` | Returns 422 | läbis |
| 32 |  | [Create] Save without originatingAuthority → 422 required (UC-22) | `POST /ljvis/v1/erru/nu/request/save` | field is originatingAuthority | läbis |
| 33 |  | [Create] Save without originatingAuthority → 422 required (UC-22) | `POST /ljvis/v1/erru/nu/request/save` | code required | läbis |
| 34 |  | [Create] Save without originatingAuthority → 422 required (UC-22) | `POST /ljvis/v1/erru/nu/request/save` | Returns 422 | läbis |
| 35 |  | [Create] Save without originatingAuthority → 422 required (UC-22) | `POST /ljvis/v1/erru/nu/request/save` | field is originatingAuthority | läbis |
| 36 |  | [Create] Save without originatingAuthority → 422 required (UC-22) | `POST /ljvis/v1/erru/nu/request/save` | code required | läbis |
| 37 |  | [Create] Save without requestSource → 422 required (UC-23) | `POST /ljvis/v1/erru/nu/request/save` | Returns 422 | läbis |
| 38 |  | [Create] Save without requestSource → 422 required (UC-23) | `POST /ljvis/v1/erru/nu/request/save` | field is requestSource | läbis |
| 39 |  | [Create] Save without requestSource → 422 required (UC-23) | `POST /ljvis/v1/erru/nu/request/save` | code required | läbis |
| 40 |  | [Create] Save without requestSource → 422 required (UC-23) | `POST /ljvis/v1/erru/nu/request/save` | Returns 422 | läbis |
| 41 |  | [Create] Save without requestSource → 422 required (UC-23) | `POST /ljvis/v1/erru/nu/request/save` | field is requestSource | läbis |
| 42 |  | [Create] Save without requestSource → 422 required (UC-23) | `POST /ljvis/v1/erru/nu/request/save` | code required | läbis |
| 43 |  | [Create] Save without requestPurpose → 422 required (UC-23) | `POST /ljvis/v1/erru/nu/request/save` | Returns 422 | läbis |
| 44 |  | [Create] Save without requestPurpose → 422 required (UC-23) | `POST /ljvis/v1/erru/nu/request/save` | field is requestPurpose | läbis |
| 45 |  | [Create] Save without requestPurpose → 422 required (UC-23) | `POST /ljvis/v1/erru/nu/request/save` | code required | läbis |
| 46 |  | [Create] Save without requestPurpose → 422 required (UC-23) | `POST /ljvis/v1/erru/nu/request/save` | Returns 422 | läbis |
| 47 |  | [Create] Save without requestPurpose → 422 required (UC-23) | `POST /ljvis/v1/erru/nu/request/save` | field is requestPurpose | läbis |
| 48 |  | [Create] Save without requestPurpose → 422 required (UC-23) | `POST /ljvis/v1/erru/nu/request/save` | code required | läbis |
| 49 |  | [Create] Save without unfitStartDate → 422 required (UC-24) | `POST /ljvis/v1/erru/nu/request/save` | Returns 422 | läbis |
| 50 |  | [Create] Save without unfitStartDate → 422 required (UC-24) | `POST /ljvis/v1/erru/nu/request/save` | field is unfitStartDate | läbis |
| 51 |  | [Create] Save without unfitStartDate → 422 required (UC-24) | `POST /ljvis/v1/erru/nu/request/save` | code required | läbis |
| 52 |  | [Create] Save without unfitStartDate → 422 required (UC-24) | `POST /ljvis/v1/erru/nu/request/save` | Returns 422 | läbis |
| 53 |  | [Create] Save without unfitStartDate → 422 required (UC-24) | `POST /ljvis/v1/erru/nu/request/save` | field is unfitStartDate | läbis |
| 54 |  | [Create] Save without unfitStartDate → 422 required (UC-24) | `POST /ljvis/v1/erru/nu/request/save` | code required | läbis |
| 55 |  | [Create] Save with nonexistent sourceGoodReputeFormKey → 404 source_not_found | `POST /ljvis/v1/erru/nu/request/save` | Returns 404 | läbis |
| 56 |  | [Create] Save with nonexistent sourceGoodReputeFormKey → 404 source_not_found | `POST /ljvis/v1/erru/nu/request/save` | code source_not_found | läbis |
| 57 |  | [Create] Save with nonexistent sourceGoodReputeFormKey → 404 source_not_found | `POST /ljvis/v1/erru/nu/request/save` | Returns 404 | läbis |
| 58 |  | [Create] Save with nonexistent sourceGoodReputeFormKey → 404 source_not_found | `POST /ljvis/v1/erru/nu/request/save` | code source_not_found | läbis |
| 59 |  | [Create] Save against a published-but-FIT declaration → 409 source_not_eligible (UC-13/UC-38) | `POST /ljvis/v1/erru/nu/request/save` | Returns 409 | läbis |
| 60 |  | [Create] Save against a published-but-FIT declaration → 409 source_not_eligible (UC-13/UC-38) | `POST /ljvis/v1/erru/nu/request/save` | code source_not_eligible | läbis |
| 61 |  | [Create] Save against a published-but-FIT declaration → 409 source_not_eligible (UC-13/UC-38) | `POST /ljvis/v1/erru/nu/request/save` | Returns 409 | läbis |
| 62 |  | [Create] Save against a published-but-FIT declaration → 409 source_not_eligible (UC-13/UC-38) | `POST /ljvis/v1/erru/nu/request/save` | code source_not_eligible | läbis |
| 63 |  | [Permissions] Save without nu.create → 403 | `POST /ljvis/v1/erru/nu/request/save` | Returns 403 | läbis |
| 64 |  | [Permissions] Save without nu.create → 403 | `POST /ljvis/v1/erru/nu/request/save` | Returns 403 | läbis |
| 65 |  | [Create] Save happy path → 200 initiated v1 | `POST /ljvis/v1/erru/nu/request/save` | Returns 200 | läbis |
| 66 |  | [Create] Save happy path → 200 initiated v1 | `POST /ljvis/v1/erru/nu/request/save` | status initiated | läbis |
| 67 |  | [Create] Save happy path → 200 initiated v1 | `POST /ljvis/v1/erru/nu/request/save` | version 1 | läbis |
| 68 |  | [Create] Save happy path → 200 initiated v1 | `POST /ljvis/v1/erru/nu/request/save` | businessCaseId has NU-EE prefix | läbis |
| 69 |  | [Create] Save happy path → 200 initiated v1 | `POST /ljvis/v1/erru/nu/request/save` | Returns 200 | läbis |
| 70 |  | [Create] Save happy path → 200 initiated v1 | `POST /ljvis/v1/erru/nu/request/save` | status initiated | läbis |
| 71 |  | [Create] Save happy path → 200 initiated v1 | `POST /ljvis/v1/erru/nu/request/save` | version 1 | läbis |
| 72 |  | [Create] Save happy path → 200 initiated v1 | `POST /ljvis/v1/erru/nu/request/save` | businessCaseId has NU-EE prefix | läbis |
| 73 |  | [Get] Get created message — identity comes from source, not client | `GET /ljvis/v1/erru/nu/get` | Returns 200 | läbis |
| 74 |  | [Get] Get created message — identity comes from source, not client | `GET /ljvis/v1/erru/nu/get` | tmFirstName from source | läbis |
| 75 |  | [Get] Get created message — identity comes from source, not client | `GET /ljvis/v1/erru/nu/get` | tmFamilyName from source | läbis |
| 76 |  | [Get] Get created message — identity comes from source, not client | `GET /ljvis/v1/erru/nu/get` | certificateNumber from source | läbis |
| 77 |  | [Get] Get created message — identity comes from source, not client | `GET /ljvis/v1/erru/nu/get` | direction outgoing | läbis |
| 78 |  | [Get] Get created message — identity comes from source, not client | `GET /ljvis/v1/erru/nu/get` | sentAt is null before send | läbis |
| 79 |  | [Permissions] Get without nu.read → 403 | `GET /ljvis/v1/erru/nu/get` | Returns 403 | läbis |
| 80 |  | [List] List contains the created message | `GET /ljvis/v1/erru/nu/list/search` | Returns 200 | läbis |
| 81 |  | [List] List contains the created message | `GET /ljvis/v1/erru/nu/list/search` | finds the created message | läbis |
| 82 |  | [List] List contains the created message | `GET /ljvis/v1/erru/nu/list/search` | direction outgoing | läbis |
| 83 |  | [List] List contains the created message | `GET /ljvis/v1/erru/nu/list/search` | countryCode is DE | läbis |
| 84 |  | [Permissions] List without nu.list → 403 | `GET /ljvis/v1/erru/nu/list/search` | Returns 403 | läbis |
| 85 |  | [Revise] Save with id changes nuTo to broadcast ZZ → v2 | `POST /ljvis/v1/erru/nu/request/save` | Returns 200 | läbis |
| 86 |  | [Revise] Save with id changes nuTo to broadcast ZZ → v2 | `POST /ljvis/v1/erru/nu/request/save` | version bumped to 2 | läbis |
| 87 |  | [Revise] Save with id changes nuTo to broadcast ZZ → v2 | `POST /ljvis/v1/erru/nu/request/save` | still initiated | läbis |
| 88 |  | [Revise] Save with id changes nuTo to broadcast ZZ → v2 | `POST /ljvis/v1/erru/nu/request/save` | Returns 200 | läbis |
| 89 |  | [Revise] Save with id changes nuTo to broadcast ZZ → v2 | `POST /ljvis/v1/erru/nu/request/save` | version bumped to 2 | läbis |
| 90 |  | [Revise] Save with id changes nuTo to broadcast ZZ → v2 | `POST /ljvis/v1/erru/nu/request/save` | still initiated | läbis |
| 91 |  | [Revise] Verify nuTo defaulted to ZZ (broadcast) and identity untouched | `GET /ljvis/v1/erru/nu/get` | Returns 200 | läbis |
| 92 |  | [Revise] Verify nuTo defaulted to ZZ (broadcast) and identity untouched | `GET /ljvis/v1/erru/nu/get` | nuTo is ZZ | läbis |
| 93 |  | [Revise] Verify nuTo defaulted to ZZ (broadcast) and identity untouched | `GET /ljvis/v1/erru/nu/get` | tmFirstName still from source | läbis |
| 94 |  | [Revise] Verify nuTo defaulted to ZZ (broadcast) and identity untouched | `GET /ljvis/v1/erru/nu/get` | certificateNumber still from source | läbis |
| 95 |  | [Revise] sourceGoodReputeFormKey from client is ignored on revision (UC-29) | `POST /ljvis/v1/erru/nu/request/save` | Returns 200 (save succeeds — the bogus sourceGoodReputeFormKey is simply ignored) | läbis |
| 96 |  | [Revise] sourceGoodReputeFormKey from client is ignored on revision (UC-29) | `POST /ljvis/v1/erru/nu/request/save` | version bumped again | läbis |
| 97 |  | [Revise] sourceGoodReputeFormKey from client is ignored on revision (UC-29) | `POST /ljvis/v1/erru/nu/request/save` | Returns 200 (save succeeds — the bogus sourceGoodReputeFormKey is simply ignored) | läbis |
| 98 |  | [Revise] sourceGoodReputeFormKey from client is ignored on revision (UC-29) | `POST /ljvis/v1/erru/nu/request/save` | version bumped again | läbis |
| 99 |  | [Revise] Verify identity still comes from the ORIGINAL source, not the swapped one (UC-29) | `GET /ljvis/v1/erru/nu/get` | Returns 200 | läbis |
| 100 |  | [Revise] Verify identity still comes from the ORIGINAL source, not the swapped one (UC-29) | `GET /ljvis/v1/erru/nu/get` | tmFirstName still JOHAN (original source), not FITPERSON | läbis |
| 101 |  | [Revise] Verify identity still comes from the ORIGINAL source, not the swapped one (UC-29) | `GET /ljvis/v1/erru/nu/get` | certificateNumber still from original source | läbis |
| 102 |  | [Revise] Verify identity still comes from the ORIGINAL source, not the swapped one (UC-29) | `GET /ljvis/v1/erru/nu/get` | nuTo did get updated to IT — the envelope fields ARE editable | läbis |
| 103 |  | [Revise] Reset nuTo back to broadcast (ZZ) so the later Broadcast-send test is unaffected by UC-29 | `POST /ljvis/v1/erru/nu/request/save` | Returns 200 | läbis |
| 104 |  | [Revise] Reset nuTo back to broadcast (ZZ) so the later Broadcast-send test is unaffected by UC-29 | `POST /ljvis/v1/erru/nu/request/save` | Returns 200 | läbis |
| 105 |  | [Concurrency] Save stale version → 409 version_conflict | `POST /ljvis/v1/erru/nu/request/save` | Stale save is rejected | läbis |
| 106 |  | [Concurrency] Save stale version → 409 version_conflict | `POST /ljvis/v1/erru/nu/request/save` | Version conflict is explicit | läbis |
| 107 |  | [Permissions] Send without nu.send → 403 | `POST /ljvis/v1/erru/nu/send` | Returns 403 | läbis |
| 108 |  | [Permissions] Send without nu.send → 403 | `POST /ljvis/v1/erru/nu/send` | Returns 403 | läbis |
| 109 |  | [Send] Broadcast (ZZ) → 200 sent with mixed OK/Timeout/NotAvailable | `POST /ljvis/v1/erru/nu/send` | Returns 200 | läbis |
| 110 |  | [Send] Broadcast (ZZ) → 200 sent with mixed OK/Timeout/NotAvailable | `POST /ljvis/v1/erru/nu/send` | status sent | läbis |
| 111 |  | [Send] Broadcast (ZZ) → 200 sent with mixed OK/Timeout/NotAvailable | `POST /ljvis/v1/erru/nu/send` | memberStates has 3 entries | läbis |
| 112 |  | [Send] Broadcast (ZZ) → 200 sent with mixed OK/Timeout/NotAvailable | `POST /ljvis/v1/erru/nu/send` | contains OK | läbis |
| 113 |  | [Send] Broadcast (ZZ) → 200 sent with mixed OK/Timeout/NotAvailable | `POST /ljvis/v1/erru/nu/send` | contains Timeout | läbis |
| 114 |  | [Send] Broadcast (ZZ) → 200 sent with mixed OK/Timeout/NotAvailable | `POST /ljvis/v1/erru/nu/send` | contains NotAvailable | läbis |
| 115 |  | [Send] Broadcast (ZZ) → 200 sent with mixed OK/Timeout/NotAvailable | `POST /ljvis/v1/erru/nu/send` | every memberState carries respondingAuthority (use=required on nurMemberStateType) | läbis |
| 116 |  | [Send] Broadcast (ZZ) → 200 sent with mixed OK/Timeout/NotAvailable | `POST /ljvis/v1/erru/nu/send` | Returns 200 | läbis |
| 117 |  | [Send] Broadcast (ZZ) → 200 sent with mixed OK/Timeout/NotAvailable | `POST /ljvis/v1/erru/nu/send` | status sent | läbis |
| 118 |  | [Send] Broadcast (ZZ) → 200 sent with mixed OK/Timeout/NotAvailable | `POST /ljvis/v1/erru/nu/send` | memberStates has 3 entries | läbis |
| 119 |  | [Send] Broadcast (ZZ) → 200 sent with mixed OK/Timeout/NotAvailable | `POST /ljvis/v1/erru/nu/send` | contains OK | läbis |
| 120 |  | [Send] Broadcast (ZZ) → 200 sent with mixed OK/Timeout/NotAvailable | `POST /ljvis/v1/erru/nu/send` | contains Timeout | läbis |
| 121 |  | [Send] Broadcast (ZZ) → 200 sent with mixed OK/Timeout/NotAvailable | `POST /ljvis/v1/erru/nu/send` | contains NotAvailable | läbis |
| 122 |  | [Send] Broadcast (ZZ) → 200 sent with mixed OK/Timeout/NotAvailable | `POST /ljvis/v1/erru/nu/send` | every memberState carries respondingAuthority (use=required on nurMemberStateType) | läbis |
| 123 |  | [Send] Verify sent: technicalId/workflowId/handler set | `GET /ljvis/v1/erru/nu/get` | Returns 200 | läbis |
| 124 |  | [Send] Verify sent: technicalId/workflowId/handler set | `GET /ljvis/v1/erru/nu/get` | technicalId present | läbis |
| 125 |  | [Send] Verify sent: technicalId/workflowId/handler set | `GET /ljvis/v1/erru/nu/get` | workflowId present | läbis |
| 126 |  | [Send] Verify sent: technicalId/workflowId/handler set | `GET /ljvis/v1/erru/nu/get` | sentAt present | läbis |
| 127 |  | [Send] Verify sent: technicalId/workflowId/handler set | `GET /ljvis/v1/erru/nu/get` | handlerPersonalCode is sender, not creator field | läbis |
| 128 |  | [Send] Verify sent: technicalId/workflowId/handler set | `GET /ljvis/v1/erru/nu/get` | version bumped by exactly 2 on send (begin-send + finish-send each append a snapshot) | läbis |
| 129 |  | [Send] Retry after sent → 409 not_sendable (no retry-in-place) | `POST /ljvis/v1/erru/nu/send` | Returns 409 | läbis |
| 130 |  | [Send] Retry after sent → 409 not_sendable (no retry-in-place) | `POST /ljvis/v1/erru/nu/send` | code not_sendable | läbis |
| 131 |  | [Send] Retry after sent → 409 not_sendable (no retry-in-place) | `POST /ljvis/v1/erru/nu/send` | Returns 409 | läbis |
| 132 |  | [Send] Retry after sent → 409 not_sendable (no retry-in-place) | `POST /ljvis/v1/erru/nu/send` | code not_sendable | läbis |
| 133 |  | [Send] Create draft targeting LV (UC-33) | `POST /ljvis/v1/erru/nu/request/save` | Returns 200 | läbis |
| 134 |  | [Send] Create draft targeting LV (UC-33) | `POST /ljvis/v1/erru/nu/request/save` | Returns 200 | läbis |
| 135 |  | [Send] LV → sent with exactly one memberStates entry, statusCode Timeout (UC-33) | `POST /ljvis/v1/erru/nu/send` | Returns 200 | läbis |
| 136 |  | [Send] LV → sent with exactly one memberStates entry, statusCode Timeout (UC-33) | `POST /ljvis/v1/erru/nu/send` | status sent | läbis |
| 137 |  | [Send] LV → sent with exactly one memberStates entry, statusCode Timeout (UC-33) | `POST /ljvis/v1/erru/nu/send` | exactly one memberStates entry | läbis |
| 138 |  | [Send] LV → sent with exactly one memberStates entry, statusCode Timeout (UC-33) | `POST /ljvis/v1/erru/nu/send` | memberStateCode is LV | läbis |
| 139 |  | [Send] LV → sent with exactly one memberStates entry, statusCode Timeout (UC-33) | `POST /ljvis/v1/erru/nu/send` | statusCode is Timeout | läbis |
| 140 |  | [Send] LV → sent with exactly one memberStates entry, statusCode Timeout (UC-33) | `POST /ljvis/v1/erru/nu/send` | Returns 200 | läbis |
| 141 |  | [Send] LV → sent with exactly one memberStates entry, statusCode Timeout (UC-33) | `POST /ljvis/v1/erru/nu/send` | status sent | läbis |
| 142 |  | [Send] LV → sent with exactly one memberStates entry, statusCode Timeout (UC-33) | `POST /ljvis/v1/erru/nu/send` | exactly one memberStates entry | läbis |
| 143 |  | [Send] LV → sent with exactly one memberStates entry, statusCode Timeout (UC-33) | `POST /ljvis/v1/erru/nu/send` | memberStateCode is LV | läbis |
| 144 |  | [Send] LV → sent with exactly one memberStates entry, statusCode Timeout (UC-33) | `POST /ljvis/v1/erru/nu/send` | statusCode is Timeout | läbis |
| 145 |  | [Send] Create draft targeting PL (UC-33) | `POST /ljvis/v1/erru/nu/request/save` | Returns 200 | läbis |
| 146 |  | [Send] Create draft targeting PL (UC-33) | `POST /ljvis/v1/erru/nu/request/save` | Returns 200 | läbis |
| 147 |  | [Send] PL → sent with exactly one memberStates entry, statusCode NotAvailable (UC-33) | `POST /ljvis/v1/erru/nu/send` | Returns 200 | läbis |
| 148 |  | [Send] PL → sent with exactly one memberStates entry, statusCode NotAvailable (UC-33) | `POST /ljvis/v1/erru/nu/send` | status sent | läbis |
| 149 |  | [Send] PL → sent with exactly one memberStates entry, statusCode NotAvailable (UC-33) | `POST /ljvis/v1/erru/nu/send` | exactly one memberStates entry | läbis |
| 150 |  | [Send] PL → sent with exactly one memberStates entry, statusCode NotAvailable (UC-33) | `POST /ljvis/v1/erru/nu/send` | memberStateCode is PL | läbis |
| 151 |  | [Send] PL → sent with exactly one memberStates entry, statusCode NotAvailable (UC-33) | `POST /ljvis/v1/erru/nu/send` | statusCode is NotAvailable | läbis |
| 152 |  | [Send] PL → sent with exactly one memberStates entry, statusCode NotAvailable (UC-33) | `POST /ljvis/v1/erru/nu/send` | Returns 200 | läbis |
| 153 |  | [Send] PL → sent with exactly one memberStates entry, statusCode NotAvailable (UC-33) | `POST /ljvis/v1/erru/nu/send` | status sent | läbis |
| 154 |  | [Send] PL → sent with exactly one memberStates entry, statusCode NotAvailable (UC-33) | `POST /ljvis/v1/erru/nu/send` | exactly one memberStates entry | läbis |
| 155 |  | [Send] PL → sent with exactly one memberStates entry, statusCode NotAvailable (UC-33) | `POST /ljvis/v1/erru/nu/send` | memberStateCode is PL | läbis |
| 156 |  | [Send] PL → sent with exactly one memberStates entry, statusCode NotAvailable (UC-33) | `POST /ljvis/v1/erru/nu/send` | statusCode is NotAvailable | läbis |
| 157 |  | [Send] Create draft targeting IT (UC-33) | `POST /ljvis/v1/erru/nu/request/save` | Returns 200 | läbis |
| 158 |  | [Send] Create draft targeting IT (UC-33) | `POST /ljvis/v1/erru/nu/request/save` | Returns 200 | läbis |
| 159 |  | [Send] IT → sent with exactly one memberStates entry, statusCode OK (UC-33) | `POST /ljvis/v1/erru/nu/send` | Returns 200 | läbis |
| 160 |  | [Send] IT → sent with exactly one memberStates entry, statusCode OK (UC-33) | `POST /ljvis/v1/erru/nu/send` | status sent | läbis |
| 161 |  | [Send] IT → sent with exactly one memberStates entry, statusCode OK (UC-33) | `POST /ljvis/v1/erru/nu/send` | exactly one memberStates entry | läbis |
| 162 |  | [Send] IT → sent with exactly one memberStates entry, statusCode OK (UC-33) | `POST /ljvis/v1/erru/nu/send` | memberStateCode is IT | läbis |
| 163 |  | [Send] IT → sent with exactly one memberStates entry, statusCode OK (UC-33) | `POST /ljvis/v1/erru/nu/send` | statusCode is OK | läbis |
| 164 |  | [Send] IT → sent with exactly one memberStates entry, statusCode OK (UC-33) | `POST /ljvis/v1/erru/nu/send` | Returns 200 | läbis |
| 165 |  | [Send] IT → sent with exactly one memberStates entry, statusCode OK (UC-33) | `POST /ljvis/v1/erru/nu/send` | status sent | läbis |
| 166 |  | [Send] IT → sent with exactly one memberStates entry, statusCode OK (UC-33) | `POST /ljvis/v1/erru/nu/send` | exactly one memberStates entry | läbis |
| 167 |  | [Send] IT → sent with exactly one memberStates entry, statusCode OK (UC-33) | `POST /ljvis/v1/erru/nu/send` | memberStateCode is IT | läbis |
| 168 |  | [Send] IT → sent with exactly one memberStates entry, statusCode OK (UC-33) | `POST /ljvis/v1/erru/nu/send` | statusCode is OK | läbis |
| 169 |  | [Send] Create second draft for FI transport-failure scenario | `POST /ljvis/v1/erru/nu/request/save` | Returns 200 | läbis |
| 170 |  | [Send] Create second draft for FI transport-failure scenario | `POST /ljvis/v1/erru/nu/request/save` | Returns 200 | läbis |
| 171 |  | [Send] FI → 502 transport failure, message transitions to error | `POST /ljvis/v1/erru/nu/send` | Returns 502 | läbis |
| 172 |  | [Send] FI → 502 transport failure, message transitions to error | `POST /ljvis/v1/erru/nu/send` | Returns 502 | läbis |
| 173 |  | [Send] Verify FI draft is in error state, no retry possible | `GET /ljvis/v1/erru/nu/get` | Returns 200 | läbis |
| 174 |  | [Send] Verify FI draft is in error state, no retry possible | `GET /ljvis/v1/erru/nu/get` | status is error | läbis |
| 175 |  | [Send] Verify FI draft is in error state, no retry possible | `GET /ljvis/v1/erru/nu/get` | errorMessage present | läbis |
| 176 |  | [Send] Retry FI from error → 409 (LJVIS2-159: no error -&gt; sent transition) | `POST /ljvis/v1/erru/nu/send` | Returns 409 — not_sendable, unlike CGR error retry | läbis |
| 177 |  | [Send] Retry FI from error → 409 (LJVIS2-159: no error -&gt; sent transition) | `POST /ljvis/v1/erru/nu/send` | Returns 409 — not_sendable, unlike CGR error retry | läbis |
| 178 |  | [Setup] declaration with unfit_until_date initially in the future (UC-38) — create | `POST /ljvis/v1/control-forms/good-repute/edit/save` | Returns 200 | läbis |
| 179 |  | [Setup] declaration with unfit_until_date initially in the future (UC-38) — confirm | `POST /ljvis/v1/control-forms/good-repute/edit/confirm` | Returns 200 | läbis |
| 180 |  | [Setup] declaration with unfit_until_date initially in the future (UC-38) — publish | `POST /ljvis/v1/control-forms/good-repute/edit/publish` | Returns 200 | läbis |
| 181 |  | [Send] Create draft before source expiry (UC-38) | `POST /ljvis/v1/erru/nu/request/save` | Returns 200 — save itself succeeds, the expiry is only checked at send (UC-38) | läbis |
| 182 |  | [Send] Create draft before source expiry (UC-38) | `POST /ljvis/v1/erru/nu/request/save` | Returns 200 — save itself succeeds, the expiry is only checked at send (UC-38) | läbis |
| 183 |  | [Setup] Expire source after drafting (UC-38) | `POST /ljvis/v1/control-forms/good-repute/edit/save` | Expiry saved | läbis |
| 184 |  | [Send] Send blocked with 409 source_not_eligible — unfit_until_date already passed (UC-38) | `POST /ljvis/v1/erru/nu/send` | Returns 409 | läbis |
| 185 |  | [Send] Send blocked with 409 source_not_eligible — unfit_until_date already passed (UC-38) | `POST /ljvis/v1/erru/nu/send` | code source_not_eligible | läbis |
| 186 |  | [Send] Send blocked with 409 source_not_eligible — unfit_until_date already passed (UC-38) | `POST /ljvis/v1/erru/nu/send` | Returns 409 | läbis |
| 187 |  | [Send] Send blocked with 409 source_not_eligible — unfit_until_date already passed (UC-38) | `POST /ljvis/v1/erru/nu/send` | code source_not_eligible | läbis |
| 188 |  | [Send] Verify draft stayed 'initiated' — blocked source does not move to sent or error (UC-38) | `GET /ljvis/v1/erru/nu/get` | Returns 200 | läbis |
| 189 |  | [Send] Verify draft stayed 'initiated' — blocked source does not move to sent or error (UC-38) | `GET /ljvis/v1/erru/nu/get` | status still initiated | läbis |
| 190 |  | [Setup] declaration to be deleted after the NU draft is created (UC-38) — create | `POST /ljvis/v1/control-forms/good-repute/edit/save` | Returns 200 | läbis |
| 191 |  | [Setup] declaration to be deleted after the NU draft is created (UC-38) — confirm | `POST /ljvis/v1/control-forms/good-repute/edit/confirm` | Returns 200 | läbis |
| 192 |  | [Setup] declaration to be deleted after the NU draft is created (UC-38) — publish | `POST /ljvis/v1/control-forms/good-repute/edit/publish` | Returns 200 | läbis |
| 193 |  | [Send] Create draft on a source that will then be deleted (UC-38) | `POST /ljvis/v1/erru/nu/request/save` | Returns 200 | läbis |
| 194 |  | [Send] Create draft on a source that will then be deleted (UC-38) | `POST /ljvis/v1/erru/nu/request/save` | Returns 200 | läbis |
| 195 |  | [Send] Delete the source good-repute declaration (UC-38) | `POST /ljvis/v1/control-forms/good-repute/edit/delete` | Returns 200 | läbis |
| 196 |  | [Send] Send blocked with 409 source_not_eligible — source was deleted (UC-38) | `POST /ljvis/v1/erru/nu/send` | Returns 409 | läbis |
| 197 |  | [Send] Send blocked with 409 source_not_eligible — source was deleted (UC-38) | `POST /ljvis/v1/erru/nu/send` | code source_not_eligible | läbis |
| 198 |  | [Send] Send blocked with 409 source_not_eligible — source was deleted (UC-38) | `POST /ljvis/v1/erru/nu/send` | Returns 409 | läbis |
| 199 |  | [Send] Send blocked with 409 source_not_eligible — source was deleted (UC-38) | `POST /ljvis/v1/erru/nu/send` | code source_not_eligible | läbis |
| 200 |  | [Inbound] Valid incoming NU → 200 ack (ruuter-internal) | `POST /ljvis/erru/nu/inbound-request` | Returns 200 | läbis |
| 201 |  | [Inbound] Valid incoming NU → 200 ack (ruuter-internal) | `POST /ljvis/erru/nu/inbound-request` | acknowledgementType correct | läbis |
| 202 |  | [Inbound] Valid incoming NU → 200 ack (ruuter-internal) | `POST /ljvis/erru/nu/inbound-request` | statusCode OK | läbis |
| 203 |  | [Inbound] Verify stored as acknowledged (not just received) | `GET /ljvis/v1/erru/nu/list/search` | Returns 200 | läbis |
| 204 |  | [Inbound] Verify stored as acknowledged (not just received) | `GET /ljvis/v1/erru/nu/list/search` | exactly one row for this businessCaseId | läbis |
| 205 |  | [Inbound] Verify stored as acknowledged (not just received) | `GET /ljvis/v1/erru/nu/list/search` | status acknowledged (latest snapshot wins tiebreaker) | läbis |
| 206 |  | [Inbound] Verify stored as acknowledged (not just received) | `GET /ljvis/v1/erru/nu/list/search` | direction incoming | läbis |
| 207 |  | [Inbound] Verify stored as acknowledged (not just received) | `GET /ljvis/v1/erru/nu/list/search` | countryCode is DE (nuFrom) | läbis |
| 208 |  | [Inbound] Duplicate technicalId → same ack, no new snapshot | `POST /ljvis/erru/nu/inbound-request` | Returns 200 | läbis |
| 209 |  | [Inbound] Duplicate technicalId → same ack, no new snapshot | `POST /ljvis/erru/nu/inbound-request` | statusCode OK (replayed ack) | läbis |
| 210 |  | [Inbound] Verify duplicate did not create a new row | `GET /ljvis/v1/erru/nu/list/search` | Returns 200 | läbis |
| 211 |  | [Inbound] Verify duplicate did not create a new row | `GET /ljvis/v1/erru/nu/list/search` | still exactly one row | läbis |
| 212 |  | [Inbound] Missing required field (requestPurpose) → 400 | `POST /ljvis/erru/nu/inbound-request` | Returns 400 | läbis |
| 213 |  | [Inbound] Missing required field (requestPurpose) → 400 | `POST /ljvis/erru/nu/inbound-request` | statusCode InvalidData | läbis |
| 214 |  | [Inbound] Heartbeat probe → 200 OK ack, nothing stored (D15) | `POST /ljvis/erru/nu/inbound-request` | Returns 200 (Heartbeat is not InvalidData, unlike a real incomplete business NU) | läbis |
| 215 |  | [Inbound] Heartbeat probe → 200 OK ack, nothing stored (D15) | `POST /ljvis/erru/nu/inbound-request` | acknowledgementType correct | läbis |
| 216 |  | [Inbound] Heartbeat probe → 200 OK ack, nothing stored (D15) | `POST /ljvis/erru/nu/inbound-request` | statusCode OK | läbis |
| 217 |  | [Inbound] Verify Heartbeat created NO NU message (159: Heartbeat is not a business NU) | `GET /ljvis/v1/erru/nu/list/search` | Returns 200 | läbis |
| 218 |  | [Inbound] Verify Heartbeat created NO NU message (159: Heartbeat is not a business NU) | `GET /ljvis/v1/erru/nu/list/search` | zero rows — Heartbeat is discarded, never stored | läbis |
| 219 |  | [Setup] Create good-repute UNFIT declaration with oversized placeOfBirth/certificateNumber | `POST /ljvis/v1/control-forms/good-repute/edit/save` | Returns 200 | läbis |
| 220 |  | [Setup] Confirm oversized good-repute declaration | `POST /ljvis/v1/control-forms/good-repute/edit/confirm` | Returns 200 | läbis |
| 221 |  | [Setup] Publish oversized good-repute declaration | `POST /ljvis/v1/control-forms/good-repute/edit/publish` | Returns 200 | läbis |
| 222 |  | [Create] Save rejected when source placeOfBirth exceeds the ERRU wire limit (50) | `POST /ljvis/v1/erru/nu/request/save` | Returns 422 (rejected before any row is written, not truncated) | läbis |
| 223 |  | [Create] Save rejected when source placeOfBirth exceeds the ERRU wire limit (50) | `POST /ljvis/v1/erru/nu/request/save` | field is tmPlaceOfBirth (checked before certificateNumber in validate-nu-request) | läbis |
| 224 |  | [Create] Save rejected when source placeOfBirth exceeds the ERRU wire limit (50) | `POST /ljvis/v1/erru/nu/request/save` | code is source_exceeds_erru_limit | läbis |
| 225 |  | [Create] Save rejected when source placeOfBirth exceeds the ERRU wire limit (50) | `POST /ljvis/v1/erru/nu/request/save` | Returns 422 (rejected before any row is written, not truncated) | läbis |
| 226 |  | [Create] Save rejected when source placeOfBirth exceeds the ERRU wire limit (50) | `POST /ljvis/v1/erru/nu/request/save` | field is tmPlaceOfBirth (checked before certificateNumber in validate-nu-request) | läbis |
| 227 |  | [Create] Save rejected when source placeOfBirth exceeds the ERRU wire limit (50) | `POST /ljvis/v1/erru/nu/request/save` | code is source_exceeds_erru_limit | läbis |
| 228 |  | [Setup] Create good-repute UNFIT declaration with oversized certificateNumber only | `POST /ljvis/v1/control-forms/good-repute/edit/save` | Returns 200 | läbis |
| 229 |  | [Setup] Confirm+publish oversized-certificate declaration (confirm) | `POST /ljvis/v1/control-forms/good-repute/edit/confirm` | Returns 200 | läbis |
| 230 |  | [Setup] Confirm+publish oversized-certificate declaration (publish) | `POST /ljvis/v1/control-forms/good-repute/edit/publish` | Returns 200 | läbis |
| 231 |  | [Create] Save rejected when source certificateNumber exceeds the ERRU wire limit (20) | `POST /ljvis/v1/erru/nu/request/save` | Returns 422 | läbis |
| 232 |  | [Create] Save rejected when source certificateNumber exceeds the ERRU wire limit (20) | `POST /ljvis/v1/erru/nu/request/save` | field is certificateNumber | läbis |
| 233 |  | [Create] Save rejected when source certificateNumber exceeds the ERRU wire limit (20) | `POST /ljvis/v1/erru/nu/request/save` | code is source_exceeds_erru_limit | läbis |
| 234 |  | [Create] Save rejected when source certificateNumber exceeds the ERRU wire limit (20) | `POST /ljvis/v1/erru/nu/request/save` | Returns 422 | läbis |
| 235 |  | [Create] Save rejected when source certificateNumber exceeds the ERRU wire limit (20) | `POST /ljvis/v1/erru/nu/request/save` | field is certificateNumber | läbis |
| 236 |  | [Create] Save rejected when source certificateNumber exceeds the ERRU wire limit (20) | `POST /ljvis/v1/erru/nu/request/save` | code is source_exceeds_erru_limit | läbis |

### 16. erru-xml-adapter

**ERRU XML-adapter** · testitüübid: integratsioon, töökindlus · kollektsioon `tests/postman/collections/erru-xml-adapter.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 |  | Adapter and Hub mock are healthy | `GET /health` | adapter healthy | läbis |
| 2 |  | Hub mock reachable, capture baseline delivery count | `GET /_test/count` | hub mock reachable | läbis |
| 3 |  | Malformed XML is rejected, nothing stored | `POST /erru/xml` | malformed XML -&gt; 400 | läbis |
| 4 |  | Malformed XML is rejected, nothing stored | `POST /erru/xml` | error is malformed_xml | läbis |
| 5 |  | Unsupported root element is rejected, nothing stored | `POST /erru/xml` | unsupported root -&gt; 400 | läbis |
| 6 |  | Unsupported root element is rejected, nothing stored | `POST /erru/xml` | error is unsupported_root_element | läbis |
| 7 |  | Oversized body is rejected with 413, not an OOM risk | `POST /erru/xml` | body over the cap -&gt; 413 | läbis |
| 8 |  | Oversized body is rejected with 413, not an OOM risk | `POST /erru/xml` | error is payload_too_large | läbis |
| 9 |  | DOCTYPE is rejected with 400, not 500 | `POST /erru/xml` | DOCTYPE -&gt; 400, not 500 | läbis |
| 10 |  | DOCTYPE is rejected with 400, not 500 | `POST /erru/xml` | error is malformed_xml | läbis |
| 11 |  | DOCTYPE is rejected with 400, not 500 | `POST /erru/xml` | rejected at the DTD peek, not just the defence-in-depth re-parse | läbis |
| 12 |  | Non-UTF-8 encoding is rejected with 400, not silently mangled | `POST /erru/xml` | non-UTF-8 -&gt; 400, not accepted-then-mangled | läbis |
| 13 |  | Non-UTF-8 encoding is rejected with 400, not silently mangled | `POST /erru/xml` | error is malformed_xml | läbis |
| 14 |  | Non-UTF-8 encoding is rejected with 400, not silently mangled | `POST /erru/xml` | detail mentions the unsupported encoding | läbis |
| 15 |  | XSD-invalid NU request (missing required Body attribute) is rejected | `POST /erru/xml` | XSD-invalid (missing businessCaseId) -&gt; 400 | läbis |
| 16 |  | XSD-invalid NU request (missing required Body attribute) is rejected | `POST /erru/xml` | error is xsd_validation_failed | läbis |
| 17 |  | Valid NU request is durably accepted (202) | `POST /erru/xml` | fresh NU request -&gt; 202 accepted | läbis |
| 18 |  | Valid NU request is durably accepted (202) | `POST /erru/xml` | status is accepted | läbis |
| 19 |  | Exact redelivery of the same NU request is idempotently accepted (202, same inboxId) | `POST /erru/xml` | exact redelivery -&gt; 202 accepted (not an error) | läbis |
| 20 |  | Exact redelivery of the same NU request is idempotently accepted (202, same inboxId) | `POST /erru/xml` | same inboxId — no duplicate row | läbis |
| 21 |  | Conflicting redelivery (same technicalId, different content) is rejected (409) | `POST /erru/xml` | conflicting redelivery -&gt; 409 | läbis |
| 22 |  | Conflicting redelivery (same technicalId, different content) is rejected (409) | `POST /erru/xml` | error is conflicting_technical_id | läbis |
| 23 |  | [Wait] give the processing/delivery loops time to run (fallback-scan bound) | `GET /_test/wait/3000` | wait completed | läbis |
| 24 |  | Mock Hub received exactly one new NotifyUnfitness_Acknowledgement | `GET /_test/count` | hub count increased by exactly 1 (redelivery + conflict did not trigger a second send) | läbis |
| 25 |  | Delivered ACK is well-formed and correlates to the original request | `GET /_test/workflow/5464ddae-987a-4538-b541-b696b15a3bca` | last delivery is 200 | läbis |
| 26 |  | Delivered ACK is well-formed and correlates to the original request | `GET /_test/workflow/5464ddae-987a-4538-b541-b696b15a3bca` | is a NotifyUnfitness_Acknowledgement | läbis |
| 27 |  | Delivered ACK is well-formed and correlates to the original request | `GET /_test/workflow/5464ddae-987a-4538-b541-b696b15a3bca` | workflowId correlates to the original request | läbis |
| 28 |  | Delivered ACK is well-formed and correlates to the original request | `GET /_test/workflow/5464ddae-987a-4538-b541-b696b15a3bca` | businessCaseId round-tripped | läbis |
| 29 |  | Delivered ACK is well-formed and correlates to the original request | `GET /_test/workflow/5464ddae-987a-4538-b541-b696b15a3bca` | statusCode is OK | läbis |
| 30 |  | Delivered ACK is well-formed and correlates to the original request | `GET /_test/workflow/5464ddae-987a-4538-b541-b696b15a3bca` | ack technicalId is NOT the inbound technicalId (fresh outbound id, no correlation-id reuse) | läbis |
| 31 |  | Delivered ACK is well-formed and correlates to the original request | `GET /_test/workflow/5464ddae-987a-4538-b541-b696b15a3bca` | Exact response QName and workflow | läbis |
| 32 |  | CGR request (7A+7B combined, matches the MTR mock's Found rule) is accepted | `POST /erru/xml` | CGR accepted | läbis |
| 33 |  | CGR Found answer has the real MTR data, not NotAvailable or a placeholder | `GET /_test/workflow/80437e31-7f1a-49cb-84ef-5934c1ec9543` | CGR MemberState statusCode is Found, not NotAvailable | läbis |
| 34 |  | CGR Found answer has the real MTR data, not NotAvailable or a placeholder | `GET /_test/workflow/80437e31-7f1a-49cb-84ef-5934c1ec9543` | licence status is the real value, not a fabricated default | läbis |
| 35 |  | CGR Found answer has the real MTR data, not NotAvailable or a placeholder | `GET /_test/workflow/80437e31-7f1a-49cb-84ef-5934c1ec9543` | licence number is the real value, not "unknown" | läbis |
| 36 |  | CGR Found answer has the real MTR data, not NotAvailable or a placeholder | `GET /_test/workflow/80437e31-7f1a-49cb-84ef-5934c1ec9543` | numberOfVehicles is a clean integer, not "8.0" | läbis |
| 37 |  | CGR Found answer has the real MTR data, not NotAvailable or a placeholder | `GET /_test/workflow/80437e31-7f1a-49cb-84ef-5934c1ec9543` | address is the real value, not "unknown"/"00000" | läbis |
| 38 |  | CGR Found answer has the real MTR data, not NotAvailable or a placeholder | `GET /_test/workflow/80437e31-7f1a-49cb-84ef-5934c1ec9543` | Exact response QName and workflow | läbis |
| 39 |  | CTUD request (AS EESTI VEOD, matches the MTR mock's Found rule) is accepted | `POST /erru/xml` | CTUD accepted | läbis |
| 40 |  | CTUD Found answer translates the compact licence-type code to the real XSD string | `GET /_test/workflow/5e1b9b96-558e-4eb9-965e-354b308bf4c3` | CTUD statusCode is Found, not NotAvailable (regression: this used to always fail here) | läbis |
| 41 |  | CTUD Found answer translates the compact licence-type code to the real XSD string | `GET /_test/workflow/5e1b9b96-558e-4eb9-965e-354b308bf4c3` | communityLicenceType is the real XSD long-form string, not the compact classifier code | läbis |
| 42 |  | CTUD Found answer translates the compact licence-type code to the real XSD string | `GET /_test/workflow/5e1b9b96-558e-4eb9-965e-354b308bf4c3` | communityLicenceType is NOT the raw compact code | läbis |
| 43 |  | CTUD Found answer translates the compact licence-type code to the real XSD string | `GET /_test/workflow/5e1b9b96-558e-4eb9-965e-354b308bf4c3` | respondingAuthority is the flow's own EE-TRAM, not NU's EE-PPA | läbis |
| 44 |  | CTUD Found answer translates the compact licence-type code to the real XSD string | `GET /_test/workflow/5e1b9b96-558e-4eb9-965e-354b308bf4c3` | numberOfEmployees is a clean integer, not "63.0" | läbis |
| 45 |  | CTUD Found answer translates the compact licence-type code to the real XSD string | `GET /_test/workflow/5e1b9b96-558e-4eb9-965e-354b308bf4c3` | Exact response QName and workflow | läbis |
| 46 |  | RSI request (with driver/undertaking/checked items) is accepted | `POST /erru/xml` | RSI accepted | läbis |
| 47 |  | RSI answer is well-formed, with the correct respondingAuthority | `GET /_test/workflow/29fcb31c-e0a1-4386-a478-40d862844c5f` | RSI statusCode is OK (EE-registered vehicle) | läbis |
| 48 |  | RSI answer is well-formed, with the correct respondingAuthority | `GET /_test/workflow/29fcb31c-e0a1-4386-a478-40d862844c5f` | respondingAuthority is set (RSI-specific, not NU's EE-PPA) | läbis |
| 49 |  | RSI answer is well-formed, with the correct respondingAuthority | `GET /_test/workflow/29fcb31c-e0a1-4386-a478-40d862844c5f` | response has no vehicleDetails (not part of the XSD answer) | läbis |
| 50 |  | RSI answer is well-formed, with the correct respondingAuthority | `GET /_test/workflow/29fcb31c-e0a1-4386-a478-40d862844c5f` | Exact response QName and workflow | läbis |
| 51 |  | NCR request (Fail, with a serious infringement, xs:boolean as 1/0) is accepted | `POST /erru/xml` | NCR accepted | läbis |
| 52 |  | NCR answer is a well-formed NCRN_Ack with the correct respondingAuthority | `GET /_test/workflow/8e145218-1761-4556-8b0c-fd62afe5cbfe` | NCR statusCode is OK | läbis |
| 53 |  | NCR answer is a well-formed NCRN_Ack with the correct respondingAuthority | `GET /_test/workflow/8e145218-1761-4556-8b0c-fd62afe5cbfe` | respondingAuthority is EE-TRAM (confirmed by LJVIS2-64's own example), not NU's EE-PPA | läbis |
| 54 |  | NCR answer is a well-formed NCRN_Ack with the correct respondingAuthority | `GET /_test/workflow/8e145218-1761-4556-8b0c-fd62afe5cbfe` | Exact response QName and workflow | läbis |
| 55 |  | Hub delivery count increased by exactly 4 (CGR + CTUD + RSI + NCR) | `GET /_test/count` | hub count increased by exactly 4 | läbis |

### 17. technical-check-forms

**Sõiduki ja haagise tehnonõuete vormid** · testitüübid: funktsionaalne, regressioon · kollektsioon `tests/postman/collections/technical-check-forms.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 2 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 3 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 4 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 5 |  | [Auth] Login — Officer (no edit_locked) | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 6 |  | [Auth] Login — Officer (no edit_locked) | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 7 |  | [Setup] Create compound form for sub-form tests | `POST /ljvis/v1/control-forms/compound-form/edit/save` | Returns 200 | läbis |
| 8 |  | [Setup] Create compound form for sub-form tests | `POST /ljvis/v1/control-forms/compound-form/edit/save` | id present | läbis |
| 9 |  | POST vehicle-technical/edit/save — no permission → 403 | `POST /ljvis/v1/control-forms/vehicle-technical/edit/save` | Returns 403 without vehicle_technical_form.write | läbis |
| 10 |  | POST vehicle-technical/edit/save — missing compoundFormKey → 422 required | `POST /ljvis/v1/control-forms/vehicle-technical/edit/save` | Returns 422 | läbis |
| 11 |  | POST vehicle-technical/edit/save — missing compoundFormKey → 422 required | `POST /ljvis/v1/control-forms/vehicle-technical/edit/save` | field is compoundFormKey | läbis |
| 12 |  | POST vehicle-technical/edit/save — missing compoundFormKey → 422 required | `POST /ljvis/v1/control-forms/vehicle-technical/edit/save` | code is required | läbis |
| 13 |  | POST vehicle-technical/edit/save — notes over 2000 chars → 422 max_length_2000 | `POST /ljvis/v1/control-forms/vehicle-technical/edit/save` | Returns 422 | läbis |
| 14 |  | POST vehicle-technical/edit/save — notes over 2000 chars → 422 max_length_2000 | `POST /ljvis/v1/control-forms/vehicle-technical/edit/save` | field is notes | läbis |
| 15 |  | POST vehicle-technical/edit/save — notes over 2000 chars → 422 max_length_2000 | `POST /ljvis/v1/control-forms/vehicle-technical/edit/save` | code is max_length_2000 | läbis |
| 16 |  | POST vehicle-technical/edit/save — create → 200, save id/subFormNumber, version=1 | `POST /ljvis/v1/control-forms/vehicle-technical/edit/save` | Returns 200 | läbis |
| 17 |  | POST vehicle-technical/edit/save — create → 200, save id/subFormNumber, version=1 | `POST /ljvis/v1/control-forms/vehicle-technical/edit/save` | Response has id, subFormNumber, version=1 | läbis |
| 18 |  | GET vehicle-technical — no permission → 403 | `GET /ljvis/v1/control-forms/vehicle-technical` | Returns 403 without read/view_unpublished permission | läbis |
| 19 |  | GET vehicle-technical — not found → 404 | `GET /ljvis/v1/control-forms/vehicle-technical` | Returns 404 for nonexistent id | läbis |
| 20 |  | GET vehicle-technical — happy path, verify fields | `GET /ljvis/v1/control-forms/vehicle-technical` | Returns 200 | läbis |
| 21 |  | GET vehicle-technical — happy path, verify fields | `GET /ljvis/v1/control-forms/vehicle-technical` | status is saved | läbis |
| 22 |  | GET vehicle-technical — happy path, verify fields | `GET /ljvis/v1/control-forms/vehicle-technical` | version is 1 | läbis |
| 23 |  | GET vehicle-technical — happy path, verify fields | `GET /ljvis/v1/control-forms/vehicle-technical` | notes match | läbis |
| 24 |  | GET vehicle-technical — happy path, verify fields | `GET /ljvis/v1/control-forms/vehicle-technical` | subFormNumber matches created id | läbis |
| 25 |  | GET vehicle-technical — happy path, verify fields | `GET /ljvis/v1/control-forms/vehicle-technical` | compoundFormKey matches | läbis |
| 26 |  | GET vehicle-technical/get-by-compound-form-key — happy path | `GET /ljvis/v1/control-forms/vehicle-technical/get-by-compound-form-key` | Returns 200 | läbis |
| 27 |  | GET vehicle-technical/get-by-compound-form-key — happy path | `GET /ljvis/v1/control-forms/vehicle-technical/get-by-compound-form-key` | list contains created sub-form | läbis |
| 28 |  | POST vehicle-technical/edit/save — re-save while saved → 200, version stays 1 | `POST /ljvis/v1/control-forms/vehicle-technical/edit/save` | Returns 200 | läbis |
| 29 |  | POST vehicle-technical/edit/save — re-save while saved → 200, version stays 1 | `POST /ljvis/v1/control-forms/vehicle-technical/edit/save` | version stays 1 (saved-state resave rule) | läbis |
| 30 |  | POST vehicle-technical/edit/save — re-save while saved → 200, version stays 1 | `POST /ljvis/v1/control-forms/vehicle-technical/edit/save` | subFormNumber unchanged | läbis |
| 31 |  | POST vehicle-technical/edit/confirm — no permission → 403 | `POST /ljvis/v1/control-forms/vehicle-technical/edit/confirm` | Returns 403 without vehicle_technical_form.write | läbis |
| 32 |  | POST vehicle-technical/edit/confirm — happy path → 200, status confirmed, version unchanged | `POST /ljvis/v1/control-forms/vehicle-technical/edit/confirm` | Returns 200 | läbis |
| 33 |  | POST vehicle-technical/edit/confirm — happy path → 200, status confirmed, version unchanged | `POST /ljvis/v1/control-forms/vehicle-technical/edit/confirm` | version unchanged by confirm | läbis |
| 34 |  | GET vehicle-technical — status is confirmed after confirm | `GET /ljvis/v1/control-forms/vehicle-technical` | Returns 200 | läbis |
| 35 |  | GET vehicle-technical — status is confirmed after confirm | `GET /ljvis/v1/control-forms/vehicle-technical` | status is confirmed | läbis |
| 36 |  | POST vehicle-technical/edit/confirm — already confirmed → 422 already_confirmed | `POST /ljvis/v1/control-forms/vehicle-technical/edit/confirm` | Returns 422 | läbis |
| 37 |  | POST vehicle-technical/edit/confirm — already confirmed → 422 already_confirmed | `POST /ljvis/v1/control-forms/vehicle-technical/edit/confirm` | code is already_confirmed | läbis |
| 38 |  | POST trailer-technical/edit/save — CAA_2 (vehicle-only part) → 422 code_not_applicable_to_trailer | `POST /ljvis/v1/control-forms/trailer-technical/edit/save` | Returns 422 | läbis |
| 39 |  | POST trailer-technical/edit/save — CAA_2 (vehicle-only part) → 422 code_not_applicable_to_trailer | `POST /ljvis/v1/control-forms/trailer-technical/edit/save` | code is code_not_applicable_to_trailer | läbis |
| 40 |  | POST trailer-technical/edit/save — MSI203 (vehicle-only violation) → 422 code_not_applicable_to_trailer | `POST /ljvis/v1/control-forms/trailer-technical/edit/save` | Returns 422 | läbis |
| 41 |  | POST trailer-technical/edit/save — MSI203 (vehicle-only violation) → 422 code_not_applicable_to_trailer | `POST /ljvis/v1/control-forms/trailer-technical/edit/save` | code is code_not_applicable_to_trailer | läbis |
| 42 |  | POST trailer-technical/edit/save — create with allowed part → 200 | `POST /ljvis/v1/control-forms/trailer-technical/edit/save` | Returns 200 | läbis |
| 43 |  | POST trailer-technical/edit/save — create with allowed part → 200 | `POST /ljvis/v1/control-forms/trailer-technical/edit/save` | Response has id, subFormNumber, version=1 | läbis |
| 44 |  | GET trailer-technical — happy path | `GET /ljvis/v1/control-forms/trailer-technical` | Returns 200 | läbis |
| 45 |  | GET trailer-technical — happy path | `GET /ljvis/v1/control-forms/trailer-technical` | notes match | läbis |
| 46 |  | GET trailer-technical — happy path | `GET /ljvis/v1/control-forms/trailer-technical` | status is saved | läbis |
| 47 |  | POST trailer-technical/edit/confirm — MSI203 vehicle-only violation → 422 code_not_applicable_to_trailer | `POST /ljvis/v1/control-forms/trailer-technical/edit/confirm` | Returns 422 | läbis |
| 48 |  | POST trailer-technical/edit/confirm — MSI203 vehicle-only violation → 422 code_not_applicable_to_trailer | `POST /ljvis/v1/control-forms/trailer-technical/edit/confirm` | code is code_not_applicable_to_trailer | läbis |
| 49 |  | POST trailer-technical/edit/confirm — happy path → 200, status confirmed, version unchanged | `POST /ljvis/v1/control-forms/trailer-technical/edit/confirm` | Returns 200 | läbis |
| 50 |  | POST trailer-technical/edit/confirm — happy path → 200, status confirmed, version unchanged | `POST /ljvis/v1/control-forms/trailer-technical/edit/confirm` | version unchanged by confirm | läbis |
| 51 |  | POST trailer-technical/edit/save — officer (no edit_locked) saves confirmed form → 422 form_locked | `POST /ljvis/v1/control-forms/trailer-technical/edit/save` | Returns 422 | läbis |
| 52 |  | POST trailer-technical/edit/save — officer (no edit_locked) saves confirmed form → 422 form_locked | `POST /ljvis/v1/control-forms/trailer-technical/edit/save` | code is form_locked | läbis |
| 53 |  | POST trailer-technical/edit/save — admin (edit_locked) saves confirmed form → 200, version bumps to 2 | `POST /ljvis/v1/control-forms/trailer-technical/edit/save` | Returns 200 | läbis |
| 54 |  | POST trailer-technical/edit/save — admin (edit_locked) saves confirmed form → 200, version bumps to 2 | `POST /ljvis/v1/control-forms/trailer-technical/edit/save` | version bumps to 2 (edit_locked re-save of locked data) | läbis |
| 55 |  | POST vehicle-technical/edit/delete — no permission → 403 | `POST /ljvis/v1/control-forms/vehicle-technical/edit/delete` | Returns 403 without control_form.delete | läbis |
| 56 |  | POST vehicle-technical/edit/delete — happy path → 200 | `POST /ljvis/v1/control-forms/vehicle-technical/edit/delete` | Returns 200 | läbis |
| 57 |  | GET vehicle-technical — deleted form still readable, status=deleted | `GET /ljvis/v1/control-forms/vehicle-technical` | Returns 200 | läbis |
| 58 |  | GET vehicle-technical — deleted form still readable, status=deleted | `GET /ljvis/v1/control-forms/vehicle-technical` | status is deleted | läbis |
| 59 |  | POST trailer-technical/edit/delete — no permission → 403 | `POST /ljvis/v1/control-forms/trailer-technical/edit/delete` | Returns 403 without control_form.delete | läbis |
| 60 |  | POST trailer-technical/edit/delete — happy path → 200 | `POST /ljvis/v1/control-forms/trailer-technical/edit/delete` | Returns 200 | läbis |
| 61 |  | GET trailer-technical — deleted form still readable, status=deleted | `GET /ljvis/v1/control-forms/trailer-technical` | Returns 200 | läbis |
| 62 |  | GET trailer-technical — deleted form still readable, status=deleted | `GET /ljvis/v1/control-forms/trailer-technical` | status is deleted | läbis |

### 18. transport-interruption

**Autoveo katkestamine** · testitüübid: funktsionaalne, regressioon · kollektsioon `tests/postman/collections/transport-interruption.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 2 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 3 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 4 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 5 |  | [Auth] Login — Officer (no edit_locked) | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 6 |  | [Auth] Login — Officer (no edit_locked) | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 7 |  | [Setup] Create compound form for sub-form tests | `POST /ljvis/v1/control-forms/compound-form/edit/save` | Returns 200 | läbis |
| 8 |  | [Setup] Create compound form for sub-form tests | `POST /ljvis/v1/control-forms/compound-form/edit/save` | id present | läbis |
| 9 |  | POST edit/save — no permission → 403 | `POST /ljvis/v1/control-forms/transport-interruption/edit/save` | Returns 403 without transport_interruption_form.write | läbis |
| 10 |  | POST edit/save — missing compoundFormKey → 422 required | `POST /ljvis/v1/control-forms/transport-interruption/edit/save` | Returns 422 | läbis |
| 11 |  | POST edit/save — missing compoundFormKey → 422 required | `POST /ljvis/v1/control-forms/transport-interruption/edit/save` | field is compoundFormKey | läbis |
| 12 |  | POST edit/save — missing compoundFormKey → 422 required | `POST /ljvis/v1/control-forms/transport-interruption/edit/save` | code is required | läbis |
| 13 |  | POST edit/save — create → 200, save id/subFormNumber, version=1, text uppercased | `POST /ljvis/v1/control-forms/transport-interruption/edit/save` | Returns 200 | läbis |
| 14 |  | POST edit/save — create → 200, save id/subFormNumber, version=1, text uppercased | `POST /ljvis/v1/control-forms/transport-interruption/edit/save` | Response has id, subFormNumber, version=1 | läbis |
| 15 |  | GET transport-interruption — no permission → 403 | `GET /ljvis/v1/control-forms/transport-interruption` | Returns 403 without read/view_unpublished permission | läbis |
| 16 |  | GET transport-interruption — not found → 404 | `GET /ljvis/v1/control-forms/transport-interruption` | Returns 404 for nonexistent id | läbis |
| 17 |  | GET transport-interruption — happy path, verify uppercase transform | `GET /ljvis/v1/control-forms/transport-interruption` | Returns 200 | läbis |
| 18 |  | GET transport-interruption — happy path, verify uppercase transform | `GET /ljvis/v1/control-forms/transport-interruption` | status is saved | läbis |
| 19 |  | GET transport-interruption — happy path, verify uppercase transform | `GET /ljvis/v1/control-forms/transport-interruption` | version is 1 | läbis |
| 20 |  | GET transport-interruption — happy path, verify uppercase transform | `GET /ljvis/v1/control-forms/transport-interruption` | headerText is uppercased | läbis |
| 21 |  | GET transport-interruption — happy path, verify uppercase transform | `GET /ljvis/v1/control-forms/transport-interruption` | interruptionReason is uppercased | läbis |
| 22 |  | GET transport-interruption — happy path, verify uppercase transform | `GET /ljvis/v1/control-forms/transport-interruption` | personApplications is uppercased | läbis |
| 23 |  | GET transport-interruption — happy path, verify uppercase transform | `GET /ljvis/v1/control-forms/transport-interruption` | residenceAddressLine is uppercased | läbis |
| 24 |  | GET transport-interruption — happy path, verify uppercase transform | `GET /ljvis/v1/control-forms/transport-interruption` | terminationCondition defaulted | läbis |
| 25 |  | GET transport-interruption — happy path, verify uppercase transform | `GET /ljvis/v1/control-forms/transport-interruption` | legalBases contains selected code | läbis |
| 26 |  | GET transport-interruption — happy path, verify uppercase transform | `GET /ljvis/v1/control-forms/transport-interruption` | subFormNumber matches created id | läbis |
| 27 |  | GET transport-interruption — happy path, verify uppercase transform | `GET /ljvis/v1/control-forms/transport-interruption` | compoundFormKey matches | läbis |
| 28 |  | POST edit/save — re-save while saved → 200, version stays 1, all 4 legalBases accepted | `POST /ljvis/v1/control-forms/transport-interruption/edit/save` | Returns 200 | läbis |
| 29 |  | POST edit/save — re-save while saved → 200, version stays 1, all 4 legalBases accepted | `POST /ljvis/v1/control-forms/transport-interruption/edit/save` | version stays 1 (saved-state resave rule) | läbis |
| 30 |  | POST edit/save — re-save while saved → 200, version stays 1, all 4 legalBases accepted | `POST /ljvis/v1/control-forms/transport-interruption/edit/save` | sub_form_number unchanged | läbis |
| 31 |  | GET transport-interruption — after re-save: terminationCondition uppercased, all 4 legalBases stored | `GET /ljvis/v1/control-forms/transport-interruption` | Returns 200 | läbis |
| 32 |  | GET transport-interruption — after re-save: terminationCondition uppercased, all 4 legalBases stored | `GET /ljvis/v1/control-forms/transport-interruption` | terminationCondition custom value is uppercased | läbis |
| 33 |  | GET transport-interruption — after re-save: terminationCondition uppercased, all 4 legalBases stored | `GET /ljvis/v1/control-forms/transport-interruption` | all 4 legalBases codes stored | läbis |
| 34 |  | GET transport-interruption/get-by-compound-form-key — happy path, list contains created sub-form | `GET /ljvis/v1/control-forms/transport-interruption/get-by-compound-form-key` | Returns 200 | läbis |
| 35 |  | GET transport-interruption/get-by-compound-form-key — happy path, list contains created sub-form | `GET /ljvis/v1/control-forms/transport-interruption/get-by-compound-form-key` | list contains created sub-form | läbis |
| 36 |  | POST edit/confirm — no permission → 403 | `POST /ljvis/v1/control-forms/transport-interruption/edit/confirm` | Returns 403 without transport_interruption_form.write | läbis |
| 37 |  | POST edit/confirm — happy path → 200, status confirmed, version unchanged | `POST /ljvis/v1/control-forms/transport-interruption/edit/confirm` | Returns 200 | läbis |
| 38 |  | POST edit/confirm — happy path → 200, status confirmed, version unchanged | `POST /ljvis/v1/control-forms/transport-interruption/edit/confirm` | version unchanged by confirm | läbis |
| 39 |  | GET transport-interruption — status is confirmed after confirm | `GET /ljvis/v1/control-forms/transport-interruption` | Returns 200 | läbis |
| 40 |  | GET transport-interruption — status is confirmed after confirm | `GET /ljvis/v1/control-forms/transport-interruption` | status is confirmed | läbis |
| 41 |  | POST edit/confirm — already confirmed → 422 already_confirmed | `POST /ljvis/v1/control-forms/transport-interruption/edit/confirm` | Returns 422 | läbis |
| 42 |  | POST edit/confirm — already confirmed → 422 already_confirmed | `POST /ljvis/v1/control-forms/transport-interruption/edit/confirm` | code is already_confirmed | läbis |
| 43 |  | POST edit/save — officer (no edit_locked) saves confirmed form → 422 form_locked | `POST /ljvis/v1/control-forms/transport-interruption/edit/save` | Returns 422 | läbis |
| 44 |  | POST edit/save — officer (no edit_locked) saves confirmed form → 422 form_locked | `POST /ljvis/v1/control-forms/transport-interruption/edit/save` | code is form_locked | läbis |
| 45 |  | POST edit/save — admin (edit_locked) saves confirmed form → 200, version bumps to 2 | `POST /ljvis/v1/control-forms/transport-interruption/edit/save` | Returns 200 | läbis |
| 46 |  | POST edit/save — admin (edit_locked) saves confirmed form → 200, version bumps to 2 | `POST /ljvis/v1/control-forms/transport-interruption/edit/save` | version bumps to 2 (edit_locked re-save of locked data) | läbis |
| 47 |  | POST transport-interruption/edit/delete — no permission → 403 | `POST /ljvis/v1/control-forms/transport-interruption/edit/delete` | Returns 403 without control_form.delete | läbis |
| 48 |  | POST transport-interruption/edit/delete — happy path → 200 | `POST /ljvis/v1/control-forms/transport-interruption/edit/delete` | Returns 200 with control_form.delete | läbis |
| 49 |  | GET transport-interruption — deleted form still readable, status=deleted | `GET /ljvis/v1/control-forms/transport-interruption` | Returns 200 | läbis |
| 50 |  | GET transport-interruption — deleted form still readable, status=deleted | `GET /ljvis/v1/control-forms/transport-interruption` | status is deleted | läbis |

### 19. adr-form

**Ohtlike veoste (ADR) vorm** · testitüübid: funktsionaalne, regressioon · kollektsioon `tests/postman/collections/adr-form.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 2 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 3 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 4 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 5 |  | [Auth] Login — Officer (no edit_locked) | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 6 |  | [Auth] Login — Officer (no edit_locked) | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 7 |  | [Setup] Create compound form for ADR sub-form tests | `POST /ljvis/v1/control-forms/compound-form/edit/save` | Returns 200 | läbis |
| 8 |  | [Setup] Create compound form for ADR sub-form tests | `POST /ljvis/v1/control-forms/compound-form/edit/save` | id present | läbis |
| 9 |  | POST adr-form/edit/save — no permission → 403 | `POST /ljvis/v1/control-forms/adr-form/edit/save` | Returns 403 without adr_form.write | läbis |
| 10 |  | POST adr-form/edit/save — missing compoundFormKey → 422 required | `POST /ljvis/v1/control-forms/adr-form/edit/save` | Returns 422 | läbis |
| 11 |  | POST adr-form/edit/save — missing compoundFormKey → 422 required | `POST /ljvis/v1/control-forms/adr-form/edit/save` | field is compoundFormKey | läbis |
| 12 |  | POST adr-form/edit/save — missing compoundFormKey → 422 required | `POST /ljvis/v1/control-forms/adr-form/edit/save` | code is required | läbis |
| 13 |  | POST adr-form/edit/save — notes over 4000 chars → 422 max_length_4000 | `POST /ljvis/v1/control-forms/adr-form/edit/save` | Returns 422 | läbis |
| 14 |  | POST adr-form/edit/save — notes over 4000 chars → 422 max_length_4000 | `POST /ljvis/v1/control-forms/adr-form/edit/save` | field is notes | läbis |
| 15 |  | POST adr-form/edit/save — notes over 4000 chars → 422 max_length_4000 | `POST /ljvis/v1/control-forms/adr-form/edit/save` | code is max_length_4000 | läbis |
| 16 |  | POST adr-form/edit/save — create → 200, save id/subFormNumber, version=1 | `POST /ljvis/v1/control-forms/adr-form/edit/save` | Returns 200 | läbis |
| 17 |  | POST adr-form/edit/save — create → 200, save id/subFormNumber, version=1 | `POST /ljvis/v1/control-forms/adr-form/edit/save` | Response has id, subFormNumber, version=1 | läbis |
| 18 |  | POST adr-form/edit/save — create → 200, save id/subFormNumber, version=1 | `POST /ljvis/v1/control-forms/adr-form/edit/save` | subFormNumber starts with ov- | läbis |
| 19 |  | GET adr-form — no permission → 403 | `GET /ljvis/v1/control-forms/adr-form` | Returns 403 without adr_form.read | läbis |
| 20 |  | GET adr-form — not found → 404 | `GET /ljvis/v1/control-forms/adr-form` | Returns 404 for nonexistent id | läbis |
| 21 |  | GET adr-form — happy path, verify fields | `GET /ljvis/v1/control-forms/adr-form` | Returns 200 | läbis |
| 22 |  | GET adr-form — happy path, verify fields | `GET /ljvis/v1/control-forms/adr-form` | status is saved | läbis |
| 23 |  | GET adr-form — happy path, verify fields | `GET /ljvis/v1/control-forms/adr-form` | version is 1 | läbis |
| 24 |  | GET adr-form — happy path, verify fields | `GET /ljvis/v1/control-forms/adr-form` | notes match | läbis |
| 25 |  | GET adr-form — happy path, verify fields | `GET /ljvis/v1/control-forms/adr-form` | resultType is ok | läbis |
| 26 |  | GET adr-form — happy path, verify fields | `GET /ljvis/v1/control-forms/adr-form` | subFormNumber matches | läbis |
| 27 |  | GET adr-form — happy path, verify fields | `GET /ljvis/v1/control-forms/adr-form` | compoundFormKey matches | läbis |
| 28 |  | GET adr-form — happy path, verify fields | `GET /ljvis/v1/control-forms/adr-form` | Uued määruse-vormi väljad tagastatakse | läbis |
| 29 |  | GET adr-form/get-by-compound-form-key — happy path | `GET /ljvis/v1/control-forms/adr-form/get-by-compound-form-key` | Returns 200 | läbis |
| 30 |  | GET adr-form/get-by-compound-form-key — happy path | `GET /ljvis/v1/control-forms/adr-form/get-by-compound-form-key` | list contains created sub-form | läbis |
| 31 |  | GET search/list — ADR-vorm ilma rikkumiseta → hasViolation false (#234) | `GET /ljvis/v1/control-forms/search/list` | Returns 200 | läbis |
| 32 |  | GET search/list — ADR-vorm ilma rikkumiseta → hasViolation false (#234) | `GET /ljvis/v1/control-forms/search/list` | ADR-vorm on otsingutulemustes | läbis |
| 33 |  | GET search/list — ADR-vorm ilma rikkumiseta → hasViolation false (#234) | `GET /ljvis/v1/control-forms/search/list` | hasViolation === false | läbis |
| 34 |  | POST adr-form/edit/save — re-save while saved → 200, version stays 1 (no-bump rule) | `POST /ljvis/v1/control-forms/adr-form/edit/save` | Returns 200 | läbis |
| 35 |  | POST adr-form/edit/save — re-save while saved → 200, version stays 1 (no-bump rule) | `POST /ljvis/v1/control-forms/adr-form/edit/save` | version stays 1 (saved-state resave rule) | läbis |
| 36 |  | POST adr-form/edit/save — re-save while saved → 200, version stays 1 (no-bump rule) | `POST /ljvis/v1/control-forms/adr-form/edit/save` | subFormNumber unchanged | läbis |
| 37 |  | POST adr-form/edit/xroad/save-xroad-fields — form not confirmed yet → 422 | `POST /ljvis/v1/control-forms/adr-form/edit/xroad/save-xroad-fields` | Returns 422 | läbis |
| 38 |  | POST adr-form/edit/xroad/save-xroad-fields — form not confirmed yet → 422 | `POST /ljvis/v1/control-forms/adr-form/edit/xroad/save-xroad-fields` | code is xroad_fields_require_confirmed_status | läbis |
| 39 |  | POST adr-form/edit/confirm — no permission → 403 | `POST /ljvis/v1/control-forms/adr-form/edit/confirm` | Returns 403 without adr_form.write | läbis |
| 40 |  | POST adr-form/edit/confirm — happy path → 200, status confirmed, version unchanged | `POST /ljvis/v1/control-forms/adr-form/edit/confirm` | Returns 200 | läbis |
| 41 |  | POST adr-form/edit/confirm — happy path → 200, status confirmed, version unchanged | `POST /ljvis/v1/control-forms/adr-form/edit/confirm` | version unchanged by confirm | läbis |
| 42 |  | GET adr-form — status is confirmed after confirm | `GET /ljvis/v1/control-forms/adr-form` | Returns 200 | läbis |
| 43 |  | GET adr-form — status is confirmed after confirm | `GET /ljvis/v1/control-forms/adr-form` | status is confirmed | läbis |
| 44 |  | GET adr-form — status is confirmed after confirm | `GET /ljvis/v1/control-forms/adr-form` | resultType is misdemeanor_proceedings | läbis |
| 45 |  | GET adr-form — status is confirmed after confirm | `GET /ljvis/v1/control-forms/adr-form` | sealOpened is true | läbis |
| 46 |  | GET adr-form — status is confirmed after confirm | `GET /ljvis/v1/control-forms/adr-form` | notes match | läbis |
| 47 |  | GET search/list — ADR-vorm rikkumisega → hasViolation true (#234) | `GET /ljvis/v1/control-forms/search/list` | Returns 200 | läbis |
| 48 |  | GET search/list — ADR-vorm rikkumisega → hasViolation true (#234) | `GET /ljvis/v1/control-forms/search/list` | ADR-vorm on otsingutulemustes | läbis |
| 49 |  | GET search/list — ADR-vorm rikkumisega → hasViolation true (#234) | `GET /ljvis/v1/control-forms/search/list` | hasViolation === true | läbis |
| 50 |  | POST adr-form/edit/confirm — already confirmed → 422 already_confirmed | `POST /ljvis/v1/control-forms/adr-form/edit/confirm` | Returns 422 | läbis |
| 51 |  | POST adr-form/edit/confirm — already confirmed → 422 already_confirmed | `POST /ljvis/v1/control-forms/adr-form/edit/confirm` | code is already_confirmed | läbis |
| 52 |  | POST adr-form/edit/xroad/save-xroad-fields — no control_form.edit_locked → 403 | `POST /ljvis/v1/control-forms/adr-form/edit/xroad/save-xroad-fields` | Returns 403 without control_form.edit_locked | läbis |
| 53 |  | POST adr-form/edit/xroad/save-xroad-fields — happy path (confirmed status) → 200 | `POST /ljvis/v1/control-forms/adr-form/edit/xroad/save-xroad-fields` | Returns 200 | läbis |
| 54 |  | POST adr-form/edit/xroad/save-xroad-fields — happy path (confirmed status) → 200 | `POST /ljvis/v1/control-forms/adr-form/edit/xroad/save-xroad-fields` | version NOT incremented (still 1) | läbis |
| 55 |  | GET adr-form — X-tee fields persisted, version unchanged | `GET /ljvis/v1/control-forms/adr-form` | Returns 200 | läbis |
| 56 |  | GET adr-form — X-tee fields persisted, version unchanged | `GET /ljvis/v1/control-forms/adr-form` | enforcementDecision persisted | läbis |
| 57 |  | GET adr-form — X-tee fields persisted, version unchanged | `GET /ljvis/v1/control-forms/adr-form` | proceedingClosureBasis persisted | läbis |
| 58 |  | GET adr-form — X-tee fields persisted, version unchanged | `GET /ljvis/v1/control-forms/adr-form` | version still 1 | läbis |
| 59 |  | POST adr-form/edit/save — officer (no edit_locked) saves confirmed form → 422 form_locked | `POST /ljvis/v1/control-forms/adr-form/edit/save` | Returns 422 | läbis |
| 60 |  | POST adr-form/edit/save — officer (no edit_locked) saves confirmed form → 422 form_locked | `POST /ljvis/v1/control-forms/adr-form/edit/save` | code is form_locked | läbis |
| 61 |  | POST adr-form/edit/save — admin (edit_locked) saves confirmed form → 200, version bumps to 2 | `POST /ljvis/v1/control-forms/adr-form/edit/save` | Returns 200 | läbis |
| 62 |  | POST adr-form/edit/save — admin (edit_locked) saves confirmed form → 200, version bumps to 2 | `POST /ljvis/v1/control-forms/adr-form/edit/save` | version bumps to 2 (edit_locked re-save of locked data) | läbis |
| 63 |  | POST adr-form/edit/delete — no permission → 403 | `POST /ljvis/v1/control-forms/adr-form/edit/delete` | Returns 403 without control_form.delete | läbis |
| 64 |  | POST adr-form/edit/delete — happy path → 200 | `POST /ljvis/v1/control-forms/adr-form/edit/delete` | Returns 200 | läbis |
| 65 |  | GET adr-form — deleted form still readable, status=deleted | `GET /ljvis/v1/control-forms/adr-form` | Returns 200 | läbis |
| 66 |  | GET adr-form — deleted form still readable, status=deleted | `GET /ljvis/v1/control-forms/adr-form` | status is deleted | läbis |

### 20. good-repute-form

**Hea maine vorm** · testitüübid: funktsionaalne, regressioon, integratsioon · kollektsioon `tests/postman/collections/good-repute-form.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 2 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 3 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 4 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 5 |  | [Auth] Login — Officer (no edit_locked) | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 6 |  | [Auth] Login — Officer (no edit_locked) | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 7 |  | POST good-repute/edit/save — no permission → 403 | `POST /ljvis/v1/control-forms/good-repute/edit/save` | Returns 403 without good_repute_form.write | läbis |
| 8 |  | POST good-repute/edit/save — missing personalCode → 422 required | `POST /ljvis/v1/control-forms/good-repute/edit/save` | Returns 422 | läbis |
| 9 |  | POST good-repute/edit/save — missing personalCode → 422 required | `POST /ljvis/v1/control-forms/good-repute/edit/save` | Field is personalCode | läbis |
| 10 |  | POST good-repute/edit/save — missing personalCode → 422 required | `POST /ljvis/v1/control-forms/good-repute/edit/save` | Code is required | läbis |
| 11 |  | POST good-repute/edit/save — future dateOfBirth → 422 future_date_not_allowed | `POST /ljvis/v1/control-forms/good-repute/edit/save` | Returns 422 | läbis |
| 12 |  | POST good-repute/edit/save — future dateOfBirth → 422 future_date_not_allowed | `POST /ljvis/v1/control-forms/good-repute/edit/save` | Field is dateOfBirth | läbis |
| 13 |  | POST good-repute/edit/save — future dateOfBirth → 422 future_date_not_allowed | `POST /ljvis/v1/control-forms/good-repute/edit/save` | Code is future_date_not_allowed | läbis |
| 14 |  | POST good-repute/edit/save — fitnessStatus=unfit without unfitFromDate → 422 required | `POST /ljvis/v1/control-forms/good-repute/edit/save` | Returns 422 | läbis |
| 15 |  | POST good-repute/edit/save — fitnessStatus=unfit without unfitFromDate → 422 required | `POST /ljvis/v1/control-forms/good-repute/edit/save` | Field is unfitFromDate | läbis |
| 16 |  | POST good-repute/edit/save — fitnessStatus=unfit without unfitFromDate → 422 required | `POST /ljvis/v1/control-forms/good-repute/edit/save` | Code is required | läbis |
| 17 |  | POST good-repute/edit/save — unfitUntilDate before unfitFromDate → 422 must_be_after_unfit_from_date | `POST /ljvis/v1/control-forms/good-repute/edit/save` | Returns 422 | läbis |
| 18 |  | POST good-repute/edit/save — unfitUntilDate before unfitFromDate → 422 must_be_after_unfit_from_date | `POST /ljvis/v1/control-forms/good-repute/edit/save` | Field is unfitUntilDate | läbis |
| 19 |  | POST good-repute/edit/save — unfitUntilDate before unfitFromDate → 422 must_be_after_unfit_from_date | `POST /ljvis/v1/control-forms/good-repute/edit/save` | Code is must_be_after_unfit_from_date | läbis |
| 20 |  | POST good-repute/edit/save — create (happy path, lowercase input) | `POST /ljvis/v1/control-forms/good-repute/edit/save` | Returns 200 | läbis |
| 21 |  | POST good-repute/edit/save — create (happy path, lowercase input) | `POST /ljvis/v1/control-forms/good-repute/edit/save` | id present | läbis |
| 22 |  | POST good-repute/edit/save — create (happy path, lowercase input) | `POST /ljvis/v1/control-forms/good-repute/edit/save` | form_number has mv- prefix | läbis |
| 23 |  | POST good-repute/edit/save — create (happy path, lowercase input) | `POST /ljvis/v1/control-forms/good-repute/edit/save` | version is 1 | läbis |
| 24 |  | GET good-repute — no permission → 403 | `GET /ljvis/v1/control-forms/good-repute` | Returns 403 without good_repute_form.read | läbis |
| 25 |  | GET good-repute — not found → 404 | `GET /ljvis/v1/control-forms/good-repute` | Returns 404 | läbis |
| 26 |  | GET good-repute — happy path, values UPPERCASED | `GET /ljvis/v1/control-forms/good-repute` | Returns 200 | läbis |
| 27 |  | GET good-repute — happy path, values UPPERCASED | `GET /ljvis/v1/control-forms/good-repute` | firstName is uppercased | läbis |
| 28 |  | GET good-repute — happy path, values UPPERCASED | `GET /ljvis/v1/control-forms/good-repute` | lastName is uppercased | läbis |
| 29 |  | GET good-repute — happy path, values UPPERCASED | `GET /ljvis/v1/control-forms/good-repute` | placeOfBirth is uppercased | läbis |
| 30 |  | GET good-repute — happy path, values UPPERCASED | `GET /ljvis/v1/control-forms/good-repute` | certificateNumber is uppercased | läbis |
| 31 |  | GET good-repute — happy path, values UPPERCASED | `GET /ljvis/v1/control-forms/good-repute` | status is saved | läbis |
| 32 |  | POST good-repute/edit/save — re-save while saved (version unchanged) | `POST /ljvis/v1/control-forms/good-repute/edit/save` | Returns 200 | läbis |
| 33 |  | POST good-repute/edit/save — re-save while saved (version unchanged) | `POST /ljvis/v1/control-forms/good-repute/edit/save` | version stays 1 (saved-state resave rule) | läbis |
| 34 |  | POST good-repute/edit/confirm — no permission → 403 | `POST /ljvis/v1/control-forms/good-repute/edit/confirm` | Returns 403 without good_repute_form.write | läbis |
| 35 |  | POST good-repute/edit/confirm — happy path (saved -&gt; confirmed, version unchanged) | `POST /ljvis/v1/control-forms/good-repute/edit/confirm` | Returns 200 | läbis |
| 36 |  | POST good-repute/edit/confirm — happy path (saved -&gt; confirmed, version unchanged) | `POST /ljvis/v1/control-forms/good-repute/edit/confirm` | version unchanged by confirm | läbis |
| 37 |  | GET good-repute — status is confirmed | `GET /ljvis/v1/control-forms/good-repute` | Returns 200 | läbis |
| 38 |  | GET good-repute — status is confirmed | `GET /ljvis/v1/control-forms/good-repute` | status is confirmed | läbis |
| 39 |  | POST good-repute/edit/confirm — already confirmed → 422 already_confirmed | `POST /ljvis/v1/control-forms/good-repute/edit/confirm` | Returns 422 | läbis |
| 40 |  | POST good-repute/edit/confirm — already confirmed → 422 already_confirmed | `POST /ljvis/v1/control-forms/good-repute/edit/confirm` | Code is already_confirmed | läbis |
| 41 |  | POST good-repute/edit/save — officer (no edit_locked) saves confirmed form → 422 form_locked_after_confirm | `POST /ljvis/v1/control-forms/good-repute/edit/save` | Returns 422 | läbis |
| 42 |  | POST good-repute/edit/save — officer (no edit_locked) saves confirmed form → 422 form_locked_after_confirm | `POST /ljvis/v1/control-forms/good-repute/edit/save` | Code is form_locked_after_confirm | läbis |
| 43 |  | POST good-repute/edit/save — admin (edit_locked) saves confirmed form → 200, version bumps to 2 | `POST /ljvis/v1/control-forms/good-repute/edit/save` | Returns 200 | läbis |
| 44 |  | POST good-repute/edit/save — admin (edit_locked) saves confirmed form → 200, version bumps to 2 | `POST /ljvis/v1/control-forms/good-repute/edit/save` | version bumps to 2 (edit_locked re-save of locked data) | läbis |
| 45 |  | POST good-repute/edit/save — create fitnessStatus=unfit with valid dates (happy path) | `POST /ljvis/v1/control-forms/good-repute/edit/save` | Returns 200 | läbis |
| 46 |  | GET good-repute — unfit dates persisted | `GET /ljvis/v1/control-forms/good-repute` | Returns 200 | läbis |
| 47 |  | GET good-repute — unfit dates persisted | `GET /ljvis/v1/control-forms/good-repute` | fitnessStatus is unfit | läbis |
| 48 |  | GET good-repute — unfit dates persisted | `GET /ljvis/v1/control-forms/good-repute` | unfitFromDate present | läbis |
| 49 |  | GET good-repute — unfit dates persisted | `GET /ljvis/v1/control-forms/good-repute` | unfitUntilDate present | läbis |
| 50 |  | POST good-repute/edit/delete — no permission → 403 | `POST /ljvis/v1/control-forms/good-repute/edit/delete` | Returns 403 without control_form.delete | läbis |
| 51 |  | POST good-repute/edit/delete — happy path → 200 | `POST /ljvis/v1/control-forms/good-repute/edit/delete` | Returns 200 | läbis |
| 52 |  | GET good-repute — deleted form still readable, status=deleted | `GET /ljvis/v1/control-forms/good-repute` | Returns 200 | läbis |
| 53 |  | GET good-repute — deleted form still readable, status=deleted | `GET /ljvis/v1/control-forms/good-repute` | status is deleted | läbis |

### 21. form-search

**Vormiotsing** · testitüübid: funktsionaalne, turve · kollektsioon `tests/postman/collections/form-search.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | Login 200 | läbis |
| 2 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | Login 200 | läbis |
| 3 |  | [Setup] Create labour-inspection act (searchable form) | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | Returns 200 | läbis |
| 4 |  | [Setup] Create labour-inspection act (searchable form) | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | Created act has id + formNumber | läbis |
| 5 |  | GET search/list — no form read permission → 403 | `GET /ljvis/v1/control-forms/search/list` | Forbidden 403 | läbis |
| 6 |  | GET search/list — admin, no filters → 200, non-empty | `GET /ljvis/v1/control-forms/search/list` | Returns 200 | läbis |
| 7 |  | GET search/list — admin, no filters → 200, non-empty | `GET /ljvis/v1/control-forms/search/list` | Non-empty result + total&gt;0 | läbis |
| 8 |  | GET search/list — admin, no filters → 200, non-empty | `GET /ljvis/v1/control-forms/search/list` | Rows expose formType/formNumber/status | läbis |
| 9 |  | GET search/list — formType=labour_inspection → only labour rows | `GET /ljvis/v1/control-forms/search/list` | Returns 200 | läbis |
| 10 |  | GET search/list — formType=labour_inspection → only labour rows | `GET /ljvis/v1/control-forms/search/list` | All rows are labour_inspection | läbis |
| 11 |  | [Setup] Re-save act 3x (creates extra snapshot versions, same key) | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | Returns 200 | läbis |
| 12 |  | [Setup] Re-save act again (3rd snapshot, same key) | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | Returns 200 | läbis |
| 13 |  | GET search/list — 3 snapshot versions of same form → exactly 1 row, latest data | `GET /ljvis/v1/control-forms/search/list` | Returns 200 | läbis |
| 14 |  | GET search/list — 3 snapshot versions of same form → exactly 1 row, latest data | `GET /ljvis/v1/control-forms/search/list` | Exactly ONE row for this form key despite 3 saved snapshot versions | läbis |
| 15 |  | GET search/list — 3 snapshot versions of same form → exactly 1 row, latest data | `GET /ljvis/v1/control-forms/search/list` | Row reflects the LATEST snapshot data, not an older version | läbis |
| 16 |  | GET search/list — searching by STALE (v1) companyName finds nothing | `GET /ljvis/v1/control-forms/search/list` | Returns 200 | läbis |
| 17 |  | GET search/list — searching by STALE (v1) companyName finds nothing | `GET /ljvis/v1/control-forms/search/list` | Old company name substring no longer matches (superseded by v2 suffix in latest snapshot) | läbis |
| 18 |  | GET search/list — companyName filter finds created act | `GET /ljvis/v1/control-forms/search/list` | Returns 200 | läbis |
| 19 |  | GET search/list — companyName filter finds created act | `GET /ljvis/v1/control-forms/search/list` | Finds our created act by key | läbis |
| 20 |  | GET search/list — date range covering control date includes act | `GET /ljvis/v1/control-forms/search/list` | Returns 200 | läbis |
| 21 |  | GET search/list — date range covering control date includes act | `GET /ljvis/v1/control-forms/search/list` | Act present in inclusive range | läbis |
| 22 |  | GET search/list — date range excluding control date hides act | `GET /ljvis/v1/control-forms/search/list` | Returns 200 | läbis |
| 23 |  | GET search/list — date range excluding control date hides act | `GET /ljvis/v1/control-forms/search/list` | Act absent from non-matching range | läbis |
| 24 |  | GET search/list — pageSize=1 → at most 1 row, total unchanged | `GET /ljvis/v1/control-forms/search/list` | Returns 200 | läbis |
| 25 |  | GET search/list — pageSize=1 → at most 1 row, total unchanged | `GET /ljvis/v1/control-forms/search/list` | At most 1 row, total reflects full set | läbis |
| 26 |  | GET search/list — sorting=main_date asc → 200 | `GET /ljvis/v1/control-forms/search/list` | Returns 200 | läbis |
| 27 |  | GET search/list — sorting=main_date asc → 200 | `GET /ljvis/v1/control-forms/search/list` | Result is a non-empty array | läbis |
| 28 |  | GET search/list — sorting=main_date asc → 200 | `GET /ljvis/v1/control-forms/search/list` | Created act is included in sorted results | läbis |
| 29 |  | GET search/list — sorting=main_date asc → 200 | `GET /ljvis/v1/control-forms/search/list` | Rows are ordered ascending by mainDate | läbis |
| 30 |  | [Cleanup] Delete labour-inspection act → 200 | `POST /ljvis/v1/control-forms/labour-inspection/edit/delete` | Returns 200 | läbis |
| 31 |  | GET search/list — deleted act hidden from results | `GET /ljvis/v1/control-forms/search/list` | Returns 200 | läbis |
| 32 |  | GET search/list — deleted act hidden from results | `GET /ljvis/v1/control-forms/search/list` | Deleted act no longer in results | läbis |

### 22. xroad-provide-query

**X-tee pakutavad teenused (päringud)** · testitüübid: integratsioon, turve · kollektsioon `tests/postman/collections/xroad-provide-query.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 | IsikuKontroll | Puuduv X-Road-Client header → 403 FORBIDDEN | `POST /ljvis/xroad/provide/isiku-kontroll` | Returns 403 | läbis |
| 2 | IsikuKontroll | Puuduv X-Road-Client header → 403 FORBIDDEN | `POST /ljvis/xroad/provide/isiku-kontroll` | error is FORBIDDEN | läbis |
| 3 | IsikuKontroll | Vale X-Road-Client formaat → 403 FORBIDDEN | `POST /ljvis/xroad/provide/isiku-kontroll` | Returns 403 | läbis |
| 4 | IsikuKontroll | Vale X-Road-Client formaat → 403 FORBIDDEN | `POST /ljvis/xroad/provide/isiku-kontroll` | error is FORBIDDEN | läbis |
| 5 | IsikuKontroll | Puuduv isikukood → 400 MISSING_PARAMETER | `POST /ljvis/xroad/provide/isiku-kontroll` | Returns 400 | läbis |
| 6 | IsikuKontroll | Puuduv isikukood → 400 MISSING_PARAMETER | `POST /ljvis/xroad/provide/isiku-kontroll` | error is MISSING_PARAMETER | läbis |
| 7 | IsikuKontroll | Vale isikukood formaat → 400 INVALID_PARAMETER | `POST /ljvis/xroad/provide/isiku-kontroll` | Returns 400 | läbis |
| 8 | IsikuKontroll | Vale isikukood formaat → 400 INVALID_PARAMETER | `POST /ljvis/xroad/provide/isiku-kontroll` | error is INVALID_PARAMETER | läbis |
| 9 | IsikuKontroll | Kehtiv päring → 200, vastus sisaldab kontrollid.item | `POST /ljvis/xroad/provide/isiku-kontroll` | Returns 200 | läbis |
| 10 | IsikuKontroll | Kehtiv päring → 200, vastus sisaldab kontrollid.item | `POST /ljvis/xroad/provide/isiku-kontroll` | vastus sisaldab kontrollid | läbis |
| 11 | IsikuKontroll | Kehtiv päring → 200, vastus sisaldab kontrollid.item | `POST /ljvis/xroad/provide/isiku-kontroll` | kontrollid.item on massiiv | läbis |
| 12 | IsikuKontroll | Tundmatu isikukood → 200, item: [] | `POST /ljvis/xroad/provide/isiku-kontroll` | Returns 200 | läbis |
| 13 | IsikuKontroll | Tundmatu isikukood → 200, item: [] | `POST /ljvis/xroad/provide/isiku-kontroll` | kontrollid.item on tühi massiiv | läbis |
| 14 | IsikuEttevoteKontrollid | Puuduv X-Road-Client header → 403 FORBIDDEN | `POST /ljvis/xroad/provide/isiku-ettevote-kontrollid` | Returns 403 | läbis |
| 15 | IsikuEttevoteKontrollid | Puuduv X-Road-Client header → 403 FORBIDDEN | `POST /ljvis/xroad/provide/isiku-ettevote-kontrollid` | error is FORBIDDEN | läbis |
| 16 | IsikuEttevoteKontrollid | Vale X-Road-Client formaat → 403 FORBIDDEN | `POST /ljvis/xroad/provide/isiku-ettevote-kontrollid` | Returns 403 | läbis |
| 17 | IsikuEttevoteKontrollid | Vale X-Road-Client formaat → 403 FORBIDDEN | `POST /ljvis/xroad/provide/isiku-ettevote-kontrollid` | error is FORBIDDEN | läbis |
| 18 | IsikuEttevoteKontrollid | Puuduv isikukood → 400 MISSING_PARAMETER | `POST /ljvis/xroad/provide/isiku-ettevote-kontrollid` | Returns 400 | läbis |
| 19 | IsikuEttevoteKontrollid | Puuduv isikukood → 400 MISSING_PARAMETER | `POST /ljvis/xroad/provide/isiku-ettevote-kontrollid` | error is MISSING_PARAMETER | läbis |
| 20 | IsikuEttevoteKontrollid | Vale isikukood formaat → 400 INVALID_PARAMETER | `POST /ljvis/xroad/provide/isiku-ettevote-kontrollid` | Returns 400 | läbis |
| 21 | IsikuEttevoteKontrollid | Vale isikukood formaat → 400 INVALID_PARAMETER | `POST /ljvis/xroad/provide/isiku-ettevote-kontrollid` | error is INVALID_PARAMETER | läbis |
| 22 | IsikuEttevoteKontrollid | Kehtiv päring → 200, vastus sisaldab kontrollid.item | `POST /ljvis/xroad/provide/isiku-ettevote-kontrollid` | Returns 200 | läbis |
| 23 | IsikuEttevoteKontrollid | Kehtiv päring → 200, vastus sisaldab kontrollid.item | `POST /ljvis/xroad/provide/isiku-ettevote-kontrollid` | vastus sisaldab kontrollid | läbis |
| 24 | IsikuEttevoteKontrollid | Kehtiv päring → 200, vastus sisaldab kontrollid.item | `POST /ljvis/xroad/provide/isiku-ettevote-kontrollid` | kontrollid.item on massiiv | läbis |
| 25 | IsikuEttevoteKontrollid | Seotud ettevõteteta isikukood → 200, item: [] | `POST /ljvis/xroad/provide/isiku-ettevote-kontrollid` | Returns 200 | läbis |
| 26 | IsikuEttevoteKontrollid | Seotud ettevõteteta isikukood → 200, item: [] | `POST /ljvis/xroad/provide/isiku-ettevote-kontrollid` | kontrollid.item on tühi massiiv | läbis |
| 27 | ErakorralineYVquery | Puuduv X-Road-Client header → 403 FORBIDDEN | `POST /ljvis/xroad/provide/erakorraline-yv-query` | Returns 403 | läbis |
| 28 | ErakorralineYVquery | Puuduv X-Road-Client header → 403 FORBIDDEN | `POST /ljvis/xroad/provide/erakorraline-yv-query` | error is FORBIDDEN | läbis |
| 29 | ErakorralineYVquery | Vale X-Road-Client formaat → 403 FORBIDDEN | `POST /ljvis/xroad/provide/erakorraline-yv-query` | Returns 403 | läbis |
| 30 | ErakorralineYVquery | Vale X-Road-Client formaat → 403 FORBIDDEN | `POST /ljvis/xroad/provide/erakorraline-yv-query` | error is FORBIDDEN | läbis |
| 31 | ErakorralineYVquery | Puuduv alates → 400 MISSING_PARAMETER | `POST /ljvis/xroad/provide/erakorraline-yv-query` | Returns 400 | läbis |
| 32 | ErakorralineYVquery | Puuduv alates → 400 MISSING_PARAMETER | `POST /ljvis/xroad/provide/erakorraline-yv-query` | error is MISSING_PARAMETER | läbis |
| 33 | ErakorralineYVquery | Puuduv kuni → 400 MISSING_PARAMETER | `POST /ljvis/xroad/provide/erakorraline-yv-query` | Returns 400 | läbis |
| 34 | ErakorralineYVquery | Puuduv kuni → 400 MISSING_PARAMETER | `POST /ljvis/xroad/provide/erakorraline-yv-query` | error is MISSING_PARAMETER | läbis |
| 35 | ErakorralineYVquery | alates &gt; kuni → 400 INVALID_PARAMETER | `POST /ljvis/xroad/provide/erakorraline-yv-query` | Returns 400 | läbis |
| 36 | ErakorralineYVquery | alates &gt; kuni → 400 INVALID_PARAMETER | `POST /ljvis/xroad/provide/erakorraline-yv-query` | error is INVALID_PARAMETER | läbis |
| 37 | ErakorralineYVquery | Tühi periood (tuleviku kuupäev) → 200, item: [] | `POST /ljvis/xroad/provide/erakorraline-yv-query` | Returns 200 | läbis |
| 38 | ErakorralineYVquery | Tühi periood (tuleviku kuupäev) → 200, item: [] | `POST /ljvis/xroad/provide/erakorraline-yv-query` | targeted_for_inspection.item on tühi massiiv | läbis |
| 39 | ErakorralineYVquery | Kehtiv päring → 200, vastus sisaldab targeted_for_inspection.item | `POST /ljvis/xroad/provide/erakorraline-yv-query` | Returns 200 | läbis |
| 40 | ErakorralineYVquery | Kehtiv päring → 200, vastus sisaldab targeted_for_inspection.item | `POST /ljvis/xroad/provide/erakorraline-yv-query` | vastus sisaldab targeted_for_inspection | läbis |
| 41 | ErakorralineYVquery | Kehtiv päring → 200, vastus sisaldab targeted_for_inspection.item | `POST /ljvis/xroad/provide/erakorraline-yv-query` | targeted_for_inspection.item on massiiv | läbis |

### 23. xroad-provide-write

**X-tee pakutavad teenused (kirjutamine)** · testitüübid: integratsioon, turve, töökindlus · kollektsioon `tests/postman/collections/xroad-provide-write.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 | ErakorralineYVconfirm | Puuduv X-Road-Client header → 403 FORBIDDEN | `POST /ljvis/xroad/provide/erakorraline-yv-confirm` | Returns 403 | läbis |
| 2 | ErakorralineYVconfirm | Puuduv X-Road-Client header → 403 FORBIDDEN | `POST /ljvis/xroad/provide/erakorraline-yv-confirm` | error is FORBIDDEN | läbis |
| 3 | ErakorralineYVconfirm | Vale X-Road-Client formaat → 403 FORBIDDEN | `POST /ljvis/xroad/provide/erakorraline-yv-confirm` | Returns 403 | läbis |
| 4 | ErakorralineYVconfirm | Vale X-Road-Client formaat → 403 FORBIDDEN | `POST /ljvis/xroad/provide/erakorraline-yv-confirm` | error is FORBIDDEN | läbis |
| 5 | ErakorralineYVconfirm | Tühi confirmed.item massiiv → 400 MISSING_PARAMETER | `POST /ljvis/xroad/provide/erakorraline-yv-confirm` | Returns 400 | läbis |
| 6 | ErakorralineYVconfirm | Tühi confirmed.item massiiv → 400 MISSING_PARAMETER | `POST /ljvis/xroad/provide/erakorraline-yv-confirm` | error is MISSING_PARAMETER | läbis |
| 7 | ErakorralineYVconfirm | Puuduv inspection_id elemendis → 400 INVALID_PARAMETER | `POST /ljvis/xroad/provide/erakorraline-yv-confirm` | Returns 400 | läbis |
| 8 | ErakorralineYVconfirm | Puuduv inspection_id elemendis → 400 INVALID_PARAMETER | `POST /ljvis/xroad/provide/erakorraline-yv-confirm` | error is MISSING_PARAMETER | läbis |
| 9 | ErakorralineYVconfirm | Lubamatu code väärtus → 400 INVALID_PARAMETER | `POST /ljvis/xroad/provide/erakorraline-yv-confirm` | Returns 400 | läbis |
| 10 | ErakorralineYVconfirm | Lubamatu code väärtus → 400 INVALID_PARAMETER | `POST /ljvis/xroad/provide/erakorraline-yv-confirm` | error is INVALID_PARAMETER | läbis |
| 11 | ErakorralineYVconfirm | Tundmatu inspection_id → 404 NOT_FOUND | `POST /ljvis/xroad/provide/erakorraline-yv-confirm` | Returns 404 | läbis |
| 12 | ErakorralineYVconfirm | Tundmatu inspection_id → 404 NOT_FOUND | `POST /ljvis/xroad/provide/erakorraline-yv-confirm` | error is NOT_FOUND | läbis |
| 13 | RegisterJobInspection v1 | Puuduv X-Road-Client header → 403 FORBIDDEN | `POST /ljvis/xroad/provide/register-job-inspection` | Returns 403 | läbis |
| 14 | RegisterJobInspection v1 | Puuduv X-Road-Client header → 403 FORBIDDEN | `POST /ljvis/xroad/provide/register-job-inspection` | error is FORBIDDEN | läbis |
| 15 | RegisterJobInspection v1 | Vale X-Road-Client formaat → 403 FORBIDDEN | `POST /ljvis/xroad/provide/register-job-inspection` | Returns 403 | läbis |
| 16 | RegisterJobInspection v1 | Vale X-Road-Client formaat → 403 FORBIDDEN | `POST /ljvis/xroad/provide/register-job-inspection` | error is FORBIDDEN | läbis |
| 17 | RegisterJobInspection v1 | Puuduv kontrollija → 400 MISSING_PARAMETER | `POST /ljvis/xroad/provide/register-job-inspection` | Returns 400 | läbis |
| 18 | RegisterJobInspection v1 | Puuduv kontrollija → 400 MISSING_PARAMETER | `POST /ljvis/xroad/provide/register-job-inspection` | error is MISSING_PARAMETER | läbis |
| 19 | RegisterJobInspection v1 | Vale kontrolli_kp formaat → 400 INVALID_PARAMETER | `POST /ljvis/xroad/provide/register-job-inspection` | Returns 400 | läbis |
| 20 | RegisterJobInspection v1 | Vale kontrolli_kp formaat → 400 INVALID_PARAMETER | `POST /ljvis/xroad/provide/register-job-inspection` | error is INVALID_PARAMETER | läbis |
| 21 | RegisterJobInspection v1 | Puuduv kontrollimised → 400 MISSING_PARAMETER | `POST /ljvis/xroad/provide/register-job-inspection` | Returns 400 | läbis |
| 22 | RegisterJobInspection v1 | Puuduv kontrollimised → 400 MISSING_PARAMETER | `POST /ljvis/xroad/provide/register-job-inspection` | error is MISSING_PARAMETER | läbis |
| 23 | RegisterJobInspection v1 | Kõik kohustuslikud väljad → 200 Success | `POST /ljvis/xroad/provide/register-job-inspection` | Returns 200 | läbis |
| 24 | RegisterJobInspection v1 | Kõik kohustuslikud väljad → 200 Success | `POST /ljvis/xroad/provide/register-job-inspection` | message is Success | läbis |
| 25 | RegisterJobInspection v1 | Korduspäring sama kontrolli_id-ga → 200 idempotentne | `POST /ljvis/xroad/provide/register-job-inspection` | Returns 200 (idempotentne) | läbis |
| 26 | RegisterJobInspection v1 | Korduspäring sama kontrolli_id-ga → 200 idempotentne | `POST /ljvis/xroad/provide/register-job-inspection` | message is Success | läbis |
| 27 | RegisterJobInspection v1 | inspection_type tuletamine: soitjate_veol=true → passenger | `POST /ljvis/xroad/provide/register-job-inspection` | Returns 200 | läbis |
| 28 | RegisterJobInspection v3 | Puuduv X-Road-Client header → 403 FORBIDDEN | `POST /ljvis/xroad/provide/register-job-inspection-v3` | Returns 403 | läbis |
| 29 | RegisterJobInspection v3 | Puuduv X-Road-Client header → 403 FORBIDDEN | `POST /ljvis/xroad/provide/register-job-inspection-v3` | error is FORBIDDEN | läbis |
| 30 | RegisterJobInspection v3 | Vale X-Road-Client formaat → 403 FORBIDDEN | `POST /ljvis/xroad/provide/register-job-inspection-v3` | Returns 403 | läbis |
| 31 | RegisterJobInspection v3 | Vale X-Road-Client formaat → 403 FORBIDDEN | `POST /ljvis/xroad/provide/register-job-inspection-v3` | error is FORBIDDEN | läbis |
| 32 | RegisterJobInspection v3 | Vale juhi_isikukood formaat → 400 INVALID_PARAMETER | `POST /ljvis/xroad/provide/register-job-inspection-v3` | Returns 400 | läbis |
| 33 | RegisterJobInspection v3 | Vale juhi_isikukood formaat → 400 INVALID_PARAMETER | `POST /ljvis/xroad/provide/register-job-inspection-v3` | error is INVALID_PARAMETER | läbis |
| 34 | RegisterJobInspection v3 | Vale menetluse_liik → 400 INVALID_PARAMETER | `POST /ljvis/xroad/provide/register-job-inspection-v3` | Returns 400 | läbis |
| 35 | RegisterJobInspection v3 | Vale menetluse_liik → 400 INVALID_PARAMETER | `POST /ljvis/xroad/provide/register-job-inspection-v3` | error is INVALID_PARAMETER | läbis |
| 36 | RegisterJobInspection v3 | Ainult v1 kohustuslikud väljad (v3 puuduvad) → 200 | `POST /ljvis/xroad/provide/register-job-inspection-v3` | Returns 200 | läbis |
| 37 | RegisterJobInspection v3 | Ainult v1 kohustuslikud väljad (v3 puuduvad) → 200 | `POST /ljvis/xroad/provide/register-job-inspection-v3` | message is Success | läbis |
| 38 | RegisterJobInspection v3 | Kõik v3 väljad → 200 Success | `POST /ljvis/xroad/provide/register-job-inspection-v3` | Returns 200 | läbis |
| 39 | RegisterJobInspection v3 | Kõik v3 väljad → 200 Success | `POST /ljvis/xroad/provide/register-job-inspection-v3` | message is Success | läbis |
| 40 | RegisterJobInspection v3 | Korduspäring sama kontrolli_id-ga → 200 idempotentne | `POST /ljvis/xroad/provide/register-job-inspection-v3` | Returns 200 (idempotentne) | läbis |
| 41 | RegisterJobInspection v3 | Korduspäring sama kontrolli_id-ga → 200 idempotentne | `POST /ljvis/xroad/provide/register-job-inspection-v3` | message is Success | läbis |
| 42 | RegisterJobInspection v3 | V1 ja v3 sama kontrolli_id ei tekita konflikti (prefiks eristab) | `POST /ljvis/xroad/provide/register-job-inspection-v3` | Returns 200 (v3 prefiks eristab v1-st) | läbis |

### 24. risk-scores

**Riskitasemed** · testitüübid: funktsionaalne, regressioon · kollektsioon `tests/postman/collections/risk-scores.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 |  | [Auth] Login — Super Admin (risk_report.list) | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 2 |  | [Auth] Login — Super Admin (risk_report.list) | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 3 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 4 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 5 |  | [Recalculate] Punane company (90000001) -&gt; 200, Punane, R=230 | `POST /ljvis/risk-scores/recalculate` | 200 OK | läbis |
| 6 |  | [Recalculate] Punane company (90000001) -&gt; 200, Punane, R=230 | `POST /ljvis/risk-scores/recalculate` | riskBandCode Punane | läbis |
| 7 |  | [Recalculate] Punane company (90000001) -&gt; 200, Punane, R=230 | `POST /ljvis/risk-scores/recalculate` | riskScore 230 | läbis |
| 8 |  | [Recalculate] Punane company (90000001) -&gt; 200, Punane, R=230 | `POST /ljvis/risk-scores/recalculate` | totalControls 2 | läbis |
| 9 |  | [Recalculate] Punane company (90000001) -&gt; 200, Punane, R=230 | `POST /ljvis/risk-scores/recalculate` | companyName present | läbis |
| 10 |  | [Recalculate] Nullpunkt company (90000002) -&gt; 200, Roheline, R=0 | `POST /ljvis/risk-scores/recalculate` | 200 OK | läbis |
| 11 |  | [Recalculate] Nullpunkt company (90000002) -&gt; 200, Roheline, R=0 | `POST /ljvis/risk-scores/recalculate` | riskBandCode Roheline | läbis |
| 12 |  | [Recalculate] Nullpunkt company (90000002) -&gt; 200, Roheline, R=0 | `POST /ljvis/risk-scores/recalculate` | totalControls 1 | läbis |
| 13 |  | [Recalculate] Valistatud company (90000003) -&gt; 200, Hall, r=0 | `POST /ljvis/risk-scores/recalculate` | 200 OK | läbis |
| 14 |  | [Recalculate] Valistatud company (90000003) -&gt; 200, Hall, r=0 | `POST /ljvis/risk-scores/recalculate` | riskBandCode Hall | läbis |
| 15 |  | [Recalculate] Valistatud company (90000003) -&gt; 200, Hall, r=0 | `POST /ljvis/risk-scores/recalculate` | riskScore is null | läbis |
| 16 |  | [Recalculate] Valistatud company (90000003) -&gt; 200, Hall, r=0 | `POST /ljvis/risk-scores/recalculate` | totalControls 0 | läbis |
| 17 |  | [Recalculate] Kollane company (90000006) -&gt; 200, Kollane, R=120 | `POST /ljvis/risk-scores/recalculate` | 200 OK | läbis |
| 18 |  | [Recalculate] Kollane company (90000006) -&gt; 200, Kollane, R=120 | `POST /ljvis/risk-scores/recalculate` | riskBandCode Kollane | läbis |
| 19 |  | [Recalculate] Kollane company (90000006) -&gt; 200, Kollane, R=120 | `POST /ljvis/risk-scores/recalculate` | riskScore 120 | läbis |
| 20 |  | [Recalculate] Kollane company (90000006) -&gt; 200, Kollane, R=120 | `POST /ljvis/risk-scores/recalculate` | totalControls 1 | läbis |
| 21 |  | [Current] Kollane company (90000006) -&gt; riskBandErru Amber | `POST /ljvis/risk-scores/current` | 200 OK | läbis |
| 22 |  | [Current] Kollane company (90000006) -&gt; riskBandErru Amber | `POST /ljvis/risk-scores/current` | riskBandCode Kollane | läbis |
| 23 |  | [Current] Kollane company (90000006) -&gt; riskBandErru Amber | `POST /ljvis/risk-scores/current` | riskBandErru Amber (not Yellow) | läbis |
| 24 |  | [Recalculate] Company with 2 compound_forms, different names -&gt; latest name wins | `POST /ljvis/risk-scores/recalculate` | 200 OK | läbis |
| 25 |  | [Recalculate] Company with 2 compound_forms, different names -&gt; latest name wins | `POST /ljvis/risk-scores/recalculate` | companyName is the MOST RECENT compound_form name, not an arbitrary one | läbis |
| 26 |  | [Recalculate] Unknown company (99999999) -&gt; 200, Hall, r=0 (no qualifying forms) | `POST /ljvis/risk-scores/recalculate` | 200 OK | läbis |
| 27 |  | [Recalculate] Unknown company (99999999) -&gt; 200, Hall, r=0 (no qualifying forms) | `POST /ljvis/risk-scores/recalculate` | riskBandCode Hall | läbis |
| 28 |  | [Recalculate] Unknown company (99999999) -&gt; 200, Hall, r=0 (no qualifying forms) | `POST /ljvis/risk-scores/recalculate` | totalControls 0 | läbis |
| 29 |  | [Recalculate] Invalid reg code format (3 digits) -&gt; 400 INVALID_PARAMETER | `POST /ljvis/risk-scores/recalculate` | 400 | läbis |
| 30 |  | [Recalculate] Invalid reg code format (3 digits) -&gt; 400 INVALID_PARAMETER | `POST /ljvis/risk-scores/recalculate` | error INVALID_PARAMETER | läbis |
| 31 |  | [Recalculate] Kontrollimata (90000005, no SP form at all) -&gt; 200, Hall, r=0 (matches Controls Breakdown's isFullyExcluded=true) | `POST /ljvis/risk-scores/recalculate` | 200 OK | läbis |
| 32 |  | [Recalculate] Kontrollimata (90000005, no SP form at all) -&gt; 200, Hall, r=0 (matches Controls Breakdown's isFullyExcluded=true) | `POST /ljvis/risk-scores/recalculate` | riskBandCode Hall (fully excluded, r=0) | läbis |
| 33 |  | [Recalculate] Kontrollimata (90000005, no SP form at all) -&gt; 200, Hall, r=0 (matches Controls Breakdown's isFullyExcluded=true) | `POST /ljvis/risk-scores/recalculate` | totalControls 0 | läbis |
| 34 |  | [Controls Breakdown] Punane (90000001) -&gt; 2 controls, not excluded, correct weighted_points | `POST /ljvis/risk-scores/controls` | 200 OK | läbis |
| 35 |  | [Controls Breakdown] Punane (90000001) -&gt; 2 controls, not excluded, correct weighted_points | `POST /ljvis/risk-scores/controls` | returns exactly 2 controls | läbis |
| 36 |  | [Controls Breakdown] Punane (90000001) -&gt; 2 controls, not excluded, correct weighted_points | `POST /ljvis/risk-scores/controls` | no control is fully excluded | läbis |
| 37 |  | [Controls Breakdown] Punane (90000001) -&gt; 2 controls, not excluded, correct weighted_points | `POST /ljvis/risk-scores/controls` | non-excluded count == totalControls from recalculate (2) | läbis |
| 38 |  | [Controls Breakdown] Punane (90000001) -&gt; 2 controls, not excluded, correct weighted_points | `POST /ljvis/risk-scores/controls` | control #1 found | läbis |
| 39 |  | [Controls Breakdown] Punane (90000001) -&gt; 2 controls, not excluded, correct weighted_points | `POST /ljvis/risk-scores/controls` | control #1: msi=1 si=1 | läbis |
| 40 |  | [Controls Breakdown] Punane (90000001) -&gt; 2 controls, not excluded, correct weighted_points | `POST /ljvis/risk-scores/controls` | control #1: weightedPoints=100 | läbis |
| 41 |  | [Controls Breakdown] Punane (90000001) -&gt; 2 controls, not excluded, correct weighted_points | `POST /ljvis/risk-scores/controls` | control #2 found | läbis |
| 42 |  | [Controls Breakdown] Punane (90000001) -&gt; 2 controls, not excluded, correct weighted_points | `POST /ljvis/risk-scores/controls` | control #2: msi=4 weighted=360 | läbis |
| 43 |  | [Controls Breakdown] Valistatud (90000003) -&gt; 1 control, isFullyExcluded=true, total_controls=0 | `POST /ljvis/risk-scores/controls` | 200 OK | läbis |
| 44 |  | [Controls Breakdown] Valistatud (90000003) -&gt; 1 control, isFullyExcluded=true, total_controls=0 | `POST /ljvis/risk-scores/controls` | returns exactly 1 control (LEFT JOIN shows all, even excluded) | läbis |
| 45 |  | [Controls Breakdown] Valistatud (90000003) -&gt; 1 control, isFullyExcluded=true, total_controls=0 | `POST /ljvis/risk-scores/controls` | the control is fully excluded (EI_KONTROLLITUD+KORRAS) | läbis |
| 46 |  | [Controls Breakdown] Valistatud (90000003) -&gt; 1 control, isFullyExcluded=true, total_controls=0 | `POST /ljvis/risk-scores/controls` | non-excluded count == totalControls from recalculate (0) | läbis |
| 47 |  | [Controls Breakdown] Nullpunkt (90000002) -&gt; 1 control, zero_point (not excluded), total_controls=1 | `POST /ljvis/risk-scores/controls` | 200 OK | läbis |
| 48 |  | [Controls Breakdown] Nullpunkt (90000002) -&gt; 1 control, zero_point (not excluded), total_controls=1 | `POST /ljvis/risk-scores/controls` | returns exactly 1 control | läbis |
| 49 |  | [Controls Breakdown] Nullpunkt (90000002) -&gt; 1 control, zero_point (not excluded), total_controls=1 | `POST /ljvis/risk-scores/controls` | control is NOT fully excluded (zero_point category) | läbis |
| 50 |  | [Controls Breakdown] Nullpunkt (90000002) -&gt; 1 control, zero_point (not excluded), total_controls=1 | `POST /ljvis/risk-scores/controls` | all violation counts = 0 (no violations = zero_point) | läbis |
| 51 |  | [Controls Breakdown] Nullpunkt (90000002) -&gt; 1 control, zero_point (not excluded), total_controls=1 | `POST /ljvis/risk-scores/controls` | non-excluded count == totalControls from recalculate (1) | läbis |
| 52 |  | [Controls Breakdown] Unknown company (99999999) -&gt; 200, empty controls list | `POST /ljvis/risk-scores/controls` | 200 OK | läbis |
| 53 |  | [Controls Breakdown] Unknown company (99999999) -&gt; 200, empty controls list | `POST /ljvis/risk-scores/controls` | empty controls list | läbis |
| 54 |  | [Controls Breakdown] Invalid reg code (3 digits) -&gt; 400 | `POST /ljvis/risk-scores/controls` | 400 bad request | läbis |
| 55 |  | [Controls Breakdown] Invalid reg code (3 digits) -&gt; 400 | `POST /ljvis/risk-scores/controls` | INVALID_PARAMETER error | läbis |
| 56 |  | [Controls Breakdown] Kontrollimata (90000005, no SP form at all) -&gt; 1 control, isFullyExcluded=true | `POST /ljvis/risk-scores/controls` | 200 OK | läbis |
| 57 |  | [Controls Breakdown] Kontrollimata (90000005, no SP form at all) -&gt; 1 control, isFullyExcluded=true | `POST /ljvis/risk-scores/controls` | returns exactly 1 control (LEFT JOIN shows it even with zero SP forms) | läbis |
| 58 |  | [Controls Breakdown] Kontrollimata (90000005, no SP form at all) -&gt; 1 control, isFullyExcluded=true | `POST /ljvis/risk-scores/controls` | isFullyExcluded=true — no SP sub-form at all is "Täielik välistamine" per formula.md §3, NOT zero-point | läbis |
| 59 |  | [Controls Breakdown] Kontrollimata (90000005, no SP form at all) -&gt; 1 control, isFullyExcluded=true | `POST /ljvis/risk-scores/controls` | all severity counts are 0 | läbis |
| 60 |  | [Current] Punane -&gt; riskBandCode Punane, riskBandErru Red | `POST /ljvis/risk-scores/current` | 200 OK | läbis |
| 61 |  | [Current] Punane -&gt; riskBandCode Punane, riskBandErru Red | `POST /ljvis/risk-scores/current` | riskBandCode Punane | läbis |
| 62 |  | [Current] Punane -&gt; riskBandCode Punane, riskBandErru Red | `POST /ljvis/risk-scores/current` | riskBandErru Red (NOT Yellow) | läbis |
| 63 |  | [Current] Nullpunkt -&gt; riskBandCode Roheline, riskBandErru Green | `POST /ljvis/risk-scores/current` | 200 OK | läbis |
| 64 |  | [Current] Nullpunkt -&gt; riskBandCode Roheline, riskBandErru Green | `POST /ljvis/risk-scores/current` | riskBandCode Roheline | läbis |
| 65 |  | [Current] Nullpunkt -&gt; riskBandCode Roheline, riskBandErru Green | `POST /ljvis/risk-scores/current` | riskBandErru Green | läbis |
| 66 |  | [Current] Valistatud -&gt; riskBandCode Hall, riskBandErru Grey | `POST /ljvis/risk-scores/current` | 200 OK | läbis |
| 67 |  | [Current] Valistatud -&gt; riskBandCode Hall, riskBandErru Grey | `POST /ljvis/risk-scores/current` | riskBandCode Hall | läbis |
| 68 |  | [Current] Valistatud -&gt; riskBandCode Hall, riskBandErru Grey | `POST /ljvis/risk-scores/current` | riskBandErru Grey | läbis |
| 69 |  | [Current] Valistatud -&gt; riskBandCode Hall, riskBandErru Grey | `POST /ljvis/risk-scores/current` | riskScore null | läbis |
| 70 |  | [Current] Company with no record at all -&gt; Hall/Grey defaults | `POST /ljvis/risk-scores/current` | 200 OK | läbis |
| 71 |  | [Current] Company with no record at all -&gt; Hall/Grey defaults | `POST /ljvis/risk-scores/current` | riskBandCode Hall | läbis |
| 72 |  | [Current] Company with no record at all -&gt; Hall/Grey defaults | `POST /ljvis/risk-scores/current` | riskBandErru Grey | läbis |
| 73 |  | [Current] Company with no record at all -&gt; Hall/Grey defaults | `POST /ljvis/risk-scores/current` | riskScore null | läbis |
| 74 |  | [Current] Company with no record at all -&gt; Hall/Grey defaults | `POST /ljvis/risk-scores/current` | totalControls 0 | läbis |
| 75 |  | [Current] Company with no record at all -&gt; Hall/Grey defaults | `POST /ljvis/risk-scores/current` | companyName null | läbis |
| 76 |  | [Admin List] 401 without auth cookie | `GET /ljvis/v1/admin/risk-scores/list` | 401 | läbis |
| 77 |  | [Admin List] 403 without risk_report.list permission | `GET /ljvis/v1/admin/risk-scores/list` | 403 | läbis |
| 78 |  | [Admin List] Basic list — contains all 3 fixture companies | `GET /ljvis/v1/admin/risk-scores/list` | 200 OK | läbis |
| 79 |  | [Admin List] Basic list — contains all 3 fixture companies | `GET /ljvis/v1/admin/risk-scores/list` | has content array | läbis |
| 80 |  | [Admin List] Basic list — contains all 3 fixture companies | `GET /ljvis/v1/admin/risk-scores/list` | has total | läbis |
| 81 |  | [Admin List] Basic list — contains all 3 fixture companies | `GET /ljvis/v1/admin/risk-scores/list` | total &gt;= 3 (fixtures) | läbis |
| 82 |  | [Admin List] Basic list — contains all 3 fixture companies | `GET /ljvis/v1/admin/risk-scores/list` | contains all 3 fixture reg codes | läbis |
| 83 |  | [Admin List] Filter riskBand=Hall -&gt; only Valistatud | `GET /ljvis/v1/admin/risk-scores/list` | 200 OK | läbis |
| 84 |  | [Admin List] Filter riskBand=Hall -&gt; only Valistatud | `GET /ljvis/v1/admin/risk-scores/list` | every row is Hall | läbis |
| 85 |  | [Admin List] Filter riskBand=Hall -&gt; only Valistatud | `GET /ljvis/v1/admin/risk-scores/list` | contains Valistatud | läbis |
| 86 |  | [Admin List] Filter regCode=90000002 -&gt; only Nullpunkt | `GET /ljvis/v1/admin/risk-scores/list` | 200 OK | läbis |
| 87 |  | [Admin List] Filter regCode=90000002 -&gt; only Nullpunkt | `GET /ljvis/v1/admin/risk-scores/list` | exactly 1 result | läbis |
| 88 |  | [Admin List] Filter regCode=90000002 -&gt; only Nullpunkt | `GET /ljvis/v1/admin/risk-scores/list` | is Nullpunkt company | läbis |
| 89 |  | [Admin List] Filter q=Punane (company name) -&gt; only Punane | `GET /ljvis/v1/admin/risk-scores/list` | 200 OK | läbis |
| 90 |  | [Admin List] Filter q=Punane (company name) -&gt; only Punane | `GET /ljvis/v1/admin/risk-scores/list` | exactly 1 result | läbis |
| 91 |  | [Admin List] Filter q=Punane (company name) -&gt; only Punane | `GET /ljvis/v1/admin/risk-scores/list` | is Punane company | läbis |
| 92 |  | [Admin List] Sort risk_score desc — Hall(null) sorts LAST | `GET /ljvis/v1/admin/risk-scores/list` | 200 OK | läbis |
| 93 |  | [Admin List] Sort risk_score desc — Hall(null) sorts LAST | `GET /ljvis/v1/admin/risk-scores/list` | 3 fixture rows present | läbis |
| 94 |  | [Admin List] Sort risk_score desc — Hall(null) sorts LAST | `GET /ljvis/v1/admin/risk-scores/list` | last of the 3 fixture rows is the Hall/null one | läbis |
| 95 |  | [Admin List] Sort risk_score desc — Hall(null) sorts LAST | `GET /ljvis/v1/admin/risk-scores/list` | first fixture row is Punane (highest score) | läbis |
| 96 |  | [Admin List] Sort company_name asc — matches frontend's actual sort key (regression) | `GET /ljvis/v1/admin/risk-scores/list` | 200 OK | läbis |
| 97 |  | [Admin List] Sort company_name asc — matches frontend's actual sort key (regression) | `GET /ljvis/v1/admin/risk-scores/list` | 4 fixture rows present | läbis |
| 98 |  | [Admin List] Sort company_name asc — matches frontend's actual sort key (regression) | `GET /ljvis/v1/admin/risk-scores/list` | NOT sorted by regCode (regression guard: frontend sends company_name, not name) | läbis |
| 99 |  | [Admin List] Sort company_name asc — matches frontend's actual sort key (regression) | `GET /ljvis/v1/admin/risk-scores/list` | actually alphabetically sorted by company name | läbis |
| 100 |  | [Citizen] Invalid regCode format -&gt; 400 (auth guard correctly bypassed) | `GET /ljvis/v1/citizen/risk-scores/my-company` | 400 | läbis |
| 101 |  | [Citizen] Invalid regCode format -&gt; 400 (auth guard correctly bypassed) | `GET /ljvis/v1/citizen/risk-scores/my-company` | error INVALID_PARAMETER | läbis |
| 102 |  | [Citizen] No auth cookie -&gt; 400 UNAUTHENTICATED (NOT 403 from parent guard) | `GET /ljvis/v1/citizen/risk-scores/my-company` | 400 (own auth check, not the parent /v1/.guard 403) | läbis |
| 103 |  | [Citizen] No auth cookie -&gt; 400 UNAUTHENTICATED (NOT 403 from parent guard) | `GET /ljvis/v1/citizen/risk-scores/my-company` | error UNAUTHENTICATED | läbis |

### 25. citizen-representation

**Kodaniku vaade ja esindusõigus** · testitüübid: funktsionaalne, turve · kollektsioon `tests/postman/collections/citizen-representation.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 |  | [Risk Scores Controls] no cookie -&gt; 400 UNAUTHENTICATED (must run before any login sets a cookie in Newman's jar) | `GET /ljvis/v1/citizen/risk-scores/controls` | 400 | läbis |
| 2 |  | [Risk Scores Controls] no cookie -&gt; 400 UNAUTHENTICATED (must run before any login sets a cookie in Newman's jar) | `GET /ljvis/v1/citizen/risk-scores/controls` | error UNAUTHENTICATED | läbis |
| 3 |  | [Auth] Login — Citizen | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 4 |  | [Auth] Login — Citizen | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 5 |  | [Switch] role=citizen-self WITHOUT registryCode key -&gt; 200 (Ruuter 0.9.12+ honours required:false — an unflagged allowlist field is optional; pre-0.9.12 this 500'd, see issue #75) | `POST /ljvis/auth/representation/switch` | 200 — Rust Ruuter 0.9.12+ treats an unflagged allowlist field (registryCode) as optional; role=citizen-self does not need it (pre-0.9.12 this was 500; issue #75) | läbis |
| 6 |  | [Switch] role=citizen-self with explicit empty registryCode -&gt; 200 (this is the correct call shape — see switchRepresentation()) | `POST /ljvis/auth/representation/switch` | 200 OK | läbis |
| 7 |  | [Switch] role=citizen-self with explicit empty registryCode -&gt; 200 (this is the correct call shape — see switchRepresentation()) | `POST /ljvis/auth/representation/switch` | activeRole is citizen-self | läbis |
| 8 |  | [Switch] role=company WITHOUT registryCode key -&gt; 400 INVALID_PARAMETER (registryCode IS required for this role) | `POST /ljvis/auth/representation/switch` | 400 | läbis |
| 9 |  | [Switch] role=company WITHOUT registryCode key -&gt; 400 INVALID_PARAMETER (registryCode IS required for this role) | `POST /ljvis/auth/representation/switch` | error INVALID_PARAMETER | läbis |
| 10 |  | [Forms Search] scope=self -&gt; 200, array response (own data only, independent of activeRole) | `POST /ljvis/v1/citizen/forms/search` | 200 OK | läbis |
| 11 |  | [Forms Search] scope=self -&gt; 200, array response (own data only, independent of activeRole) | `POST /ljvis/v1/citizen/forms/search` | response is an array | läbis |
| 12 |  | [Forms Search] scope=company, unrepresented registry_code -&gt; 403 NOT_REPRESENTATIVE | `POST /ljvis/v1/citizen/forms/search` | 403 | läbis |
| 13 |  | [Forms Search] scope=company, unrepresented registry_code -&gt; 403 NOT_REPRESENTATIVE | `POST /ljvis/v1/citizen/forms/search` | error NOT_REPRESENTATIVE | läbis |
| 14 |  | [Forms Search] scope=company, invalid registry_code format -&gt; 400 INVALID_PARAMETER | `POST /ljvis/v1/citizen/forms/search` | 400 | läbis |
| 15 |  | [Forms Search] scope=company, invalid registry_code format -&gt; 400 INVALID_PARAMETER | `POST /ljvis/v1/citizen/forms/search` | error INVALID_PARAMETER | läbis |
| 16 |  | [Risk Scores Controls] unrepresented company -&gt; 403 NOT_REPRESENTATIVE (cannot read another company's breakdown via ?q=) | `GET /ljvis/v1/citizen/risk-scores/controls` | 403 | läbis |
| 17 |  | [Risk Scores Controls] unrepresented company -&gt; 403 NOT_REPRESENTATIVE (cannot read another company's breakdown via ?q=) | `GET /ljvis/v1/citizen/risk-scores/controls` | error NOT_REPRESENTATIVE | läbis |
| 18 |  | [Risk Scores Controls] invalid q format -&gt; 400 INVALID_PARAMETER | `GET /ljvis/v1/citizen/risk-scores/controls` | 400 | läbis |
| 19 |  | [Risk Scores Controls] invalid q format -&gt; 400 INVALID_PARAMETER | `GET /ljvis/v1/citizen/risk-scores/controls` | error INVALID_PARAMETER | läbis |

### 26. cron-jobs

**Ajastatud tööd (cron)** · testitüübid: töökindlus, integratsioon, regressioon · kollektsioon `tests/postman/collections/cron-jobs.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 |  | [Setup] Resolve an organisation id (for user seeding) | `POST /ljvis/organisation/list_organisations` | Returns 200 | läbis |
| 2 |  | [Setup] Resolve an organisation id (for user seeding) | `POST /ljvis/organisation/list_organisations` | At least one organisation exists | läbis |
| 3 |  | [LJVIS2-12 Setup] Insert user with past access_end + no groups yet | `POST /ljvis/user/insert_user_account` | Returns 200 | läbis |
| 4 |  | [LJVIS2-12 Setup] Insert user with past access_end + no groups yet | `POST /ljvis/user/insert_user_account` | User inserted | läbis |
| 5 |  | [LJVIS2-12 Setup] Resolve a real user group id | `POST /ljvis/user_group/list_user_groups` | Returns 200 | läbis |
| 6 |  | [LJVIS2-12 Setup] Resolve a real user group id | `POST /ljvis/user_group/list_user_groups` | At least one user group exists | läbis |
| 7 |  | [LJVIS2-12 Setup] Attach a user group to the expired user | `POST /ljvis/user/set_user_groups` | Returns 200 | läbis |
| 8 |  | [LJVIS2-12 Setup] Confirm status=active before deactivation | `POST /ljvis/user/get_user` | Returns 200 | läbis |
| 9 |  | [LJVIS2-12 Setup] Confirm status=active before deactivation | `POST /ljvis/user/get_user` | Status is still active before the job runs | läbis |
| 10 |  | [LJVIS2-12 Setup] Confirm groups attached before deactivation | `POST /ljvis/user/get_user_groups` | Returns 200 | läbis |
| 11 |  | [LJVIS2-12 Setup] Confirm groups attached before deactivation | `POST /ljvis/user/get_user_groups` | Has at least one group before the job runs | läbis |
| 12 |  | [LJVIS2-12] POST cron/users/deactivate-expired — deactivates and clears groups | `POST /ljvis/users/deactivate-expired` | Returns 200 (regression: previously 500'd via a call to a non-existent rebuild_user_account_latest endpoint) | läbis |
| 13 |  | [LJVIS2-12] POST cron/users/deactivate-expired — deactivates and clears groups | `POST /ljvis/users/deactivate-expired` | Our seeded expired user is in the deactivated list | läbis |
| 14 |  | [LJVIS2-12] Verify: status=inactive | `POST /ljvis/user/get_user` | Returns 200 | läbis |
| 15 |  | [LJVIS2-12] Verify: status=inactive | `POST /ljvis/user/get_user` | status = inactive | läbis |
| 16 |  | [LJVIS2-12] Verify: user_groups cleared (LJVIS2-12 AC#2) | `POST /ljvis/user/get_user_groups` | Returns 200 | läbis |
| 17 |  | [LJVIS2-12] Verify: user_groups cleared (LJVIS2-12 AC#2) | `POST /ljvis/user/get_user_groups` | No groups remain (LJVIS2-12 AC#2) | läbis |
| 18 |  | [LJVIS2-12] Idempotency: re-running the job does not re-select the same user | `POST /ljvis/users/deactivate-expired` | Returns 200 | läbis |
| 19 |  | [LJVIS2-12] Idempotency: re-running the job does not re-select the same user | `POST /ljvis/users/deactivate-expired` | Regression: our already-inactive user is NOT re-selected (fixed latest-row-vs-filter bug) | läbis |
| 20 |  | [e-toimik Setup] Insert confirmed labour_inspection_form (candidate) | `POST /ljvis/control-forms/labour-inspection/insert` | Returns 200 | läbis |
| 21 |  | [e-toimik] select_etoimik_candidates — new act is a candidate | `POST /ljvis/control-forms/labour-inspection/select_etoimik_candidates` | Returns 200 | läbis |
| 22 |  | [e-toimik] select_etoimik_candidates — new act is a candidate | `POST /ljvis/control-forms/labour-inspection/select_etoimik_candidates` | Seeded act appears as a candidate | läbis |
| 23 |  | [e-toimik] apply_etoimik_decision found=false — no-op (0 rows) | `POST /ljvis/control-forms/labour-inspection/apply_etoimik_decision` | Returns 200 | läbis |
| 24 |  | [e-toimik] apply_etoimik_decision found=false — no-op (0 rows) | `POST /ljvis/control-forms/labour-inspection/apply_etoimik_decision` | found=false writes nothing | läbis |
| 25 |  | [e-toimik] apply_etoimik_decision found=true — publishes + writes decision | `POST /ljvis/control-forms/labour-inspection/apply_etoimik_decision` | Returns 200 | läbis |
| 26 |  | [e-toimik] apply_etoimik_decision found=true — publishes + writes decision | `POST /ljvis/control-forms/labour-inspection/apply_etoimik_decision` | Wrote exactly one new snapshot | läbis |
| 27 |  | [e-toimik] apply_etoimik_decision found=true — publishes + writes decision | `POST /ljvis/control-forms/labour-inspection/apply_etoimik_decision` | status is published (LJVIS2-69 auto-publish) | läbis |
| 28 |  | [e-toimik] apply_etoimik_decision found=true — publishes + writes decision | `POST /ljvis/control-forms/labour-inspection/apply_etoimik_decision` | version bumped to 2 | läbis |
| 29 |  | [e-toimik] select_etoimik_candidates — resolved act no longer a candidate (regression) | `POST /ljvis/control-forms/labour-inspection/select_etoimik_candidates` | Returns 200 | läbis |
| 30 |  | [e-toimik] select_etoimik_candidates — resolved act no longer a candidate (regression) | `POST /ljvis/control-forms/labour-inspection/select_etoimik_candidates` | Regression: resolved act does NOT reappear (fixed latest-row-vs-filter bug) | läbis |
| 31 |  | [e-toimik] apply_etoimik_decision again, same key — guarded no-op (already published) | `POST /ljvis/control-forms/labour-inspection/apply_etoimik_decision` | Returns 200 | läbis |
| 32 |  | [e-toimik] apply_etoimik_decision again, same key — guarded no-op (already published) | `POST /ljvis/control-forms/labour-inspection/apply_etoimik_decision` | No double-publish — status&lt;&gt;confirmed guard holds | läbis |
| 33 |  | [e-toimik] Verify final state via get.sql (decision persisted, no double snapshot) | `POST /ljvis/control-forms/labour-inspection/get` | Returns 200 | läbis |
| 34 |  | [e-toimik] Verify final state via get.sql (decision persisted, no double snapshot) | `POST /ljvis/control-forms/labour-inspection/get` | status = published | läbis |
| 35 |  | [e-toimik] Verify final state via get.sql (decision persisted, no double snapshot) | `POST /ljvis/control-forms/labour-inspection/get` | version = 2 (not 3 — the repeat apply call above was a true no-op) | läbis |
| 36 |  | [e-toimik] Verify final state via get.sql (decision persisted, no double snapshot) | `POST /ljvis/control-forms/labour-inspection/get` | enforcement_decision persisted | läbis |
| 37 |  | [e-toimik] Verify final state via get.sql (decision persisted, no double snapshot) | `POST /ljvis/control-forms/labour-inspection/get` | proceeding_closure_basis persisted | läbis |
| 38 |  | [e-toimik] log_etoimik_publish_audit found=false — no audit row | `POST /ljvis/control-forms/labour-inspection/log_etoimik_publish_audit` | Returns 200 | läbis |
| 39 |  | [e-toimik] log_etoimik_publish_audit found=false — no audit row | `POST /ljvis/control-forms/labour-inspection/log_etoimik_publish_audit` | No audit event written | läbis |
| 40 |  | [e-toimik] log_etoimik_publish_audit found=true — audit event written | `POST /ljvis/control-forms/labour-inspection/log_etoimik_publish_audit` | Returns 200 | läbis |
| 41 |  | [e-toimik] log_etoimik_publish_audit found=true — audit event written | `POST /ljvis/control-forms/labour-inspection/log_etoimik_publish_audit` | Audit event written with an event_id | läbis |
| 42 |  | [yvkehtivus Setup] Insert compound_form with a vehicle reg number | `POST /ljvis/control-forms/compound-form/insert` | Returns 200 | läbis |
| 43 |  | [yvkehtivus Setup] Insert confirmed vehicle_technical_form (extraordinary_inspection) | `POST /ljvis/control-forms/vehicle-technical/insert` | Returns 200 | läbis |
| 44 |  | [yvkehtivus] select_yvkehtivus_candidates — new sub-form is a candidate | `POST /ljvis/control-forms/vehicle-technical/select_yvkehtivus_candidates` | Returns 200 | läbis |
| 45 |  | [yvkehtivus] select_yvkehtivus_candidates — new sub-form is a candidate | `POST /ljvis/control-forms/vehicle-technical/select_yvkehtivus_candidates` | Seeded sub-form appears as a candidate | läbis |
| 46 |  | [yvkehtivus] select_yvkehtivus_candidates — new sub-form is a candidate | `POST /ljvis/control-forms/vehicle-technical/select_yvkehtivus_candidates` | Candidate carries the right registration number | läbis |
| 47 |  | [yvkehtivus] update-extraordinary-inspection-date, empty date — no-op (0 rows) | `POST /ljvis/control-forms/vehicle-technical/update-extraordinary-inspection-date` | Returns 200 | läbis |
| 48 |  | [yvkehtivus] update-extraordinary-inspection-date, empty date — no-op (0 rows) | `POST /ljvis/control-forms/vehicle-technical/update-extraordinary-inspection-date` | Empty date writes nothing (regression: previously this would have thrown on ''::DATE if reached, so the guard matters) | läbis |
| 49 |  | [yvkehtivus] update-extraordinary-inspection-date, real date — writes in place | `POST /ljvis/control-forms/vehicle-technical/update-extraordinary-inspection-date` | Returns 200 | läbis |
| 50 |  | [yvkehtivus] update-extraordinary-inspection-date, real date — writes in place | `POST /ljvis/control-forms/vehicle-technical/update-extraordinary-inspection-date` | Wrote exactly one row | läbis |
| 51 |  | [yvkehtivus] update-extraordinary-inspection-date, real date — writes in place | `POST /ljvis/control-forms/vehicle-technical/update-extraordinary-inspection-date` | version stays 1 — in-place update, not a new snapshot (LJVIS2-72 §4 convention) | läbis |
| 52 |  | [yvkehtivus] select_yvkehtivus_candidates — resolved sub-form no longer a candidate | `POST /ljvis/control-forms/vehicle-technical/select_yvkehtivus_candidates` | Returns 200 | läbis |
| 53 |  | [yvkehtivus] select_yvkehtivus_candidates — resolved sub-form no longer a candidate | `POST /ljvis/control-forms/vehicle-technical/select_yvkehtivus_candidates` | Resolved sub-form does not reappear | läbis |
| 54 |  | [yvkehtivus] update-extraordinary-inspection-date again, same key — idempotent no-op | `POST /ljvis/control-forms/vehicle-technical/update-extraordinary-inspection-date` | Returns 200 | läbis |
| 55 |  | [yvkehtivus] update-extraordinary-inspection-date again, same key — idempotent no-op | `POST /ljvis/control-forms/vehicle-technical/update-extraordinary-inspection-date` | Already-resolved sub-form is not overwritten again | läbis |
| 56 |  | [yvkehtivus] Verify final state — date set, xroad fields untouched (no clobbering) | `POST /ljvis/control-forms/vehicle-technical/get` | Returns 200 | läbis |
| 57 |  | [yvkehtivus] Verify final state — date set, xroad fields untouched (no clobbering) | `POST /ljvis/control-forms/vehicle-technical/get` | extraordinary_inspection_date is the FIRST value written, not the second no-op attempt | läbis |
| 58 |  | [yvkehtivus] Verify final state — date set, xroad fields untouched (no clobbering) | `POST /ljvis/control-forms/vehicle-technical/get` | enforcement_decision untouched (still null) — this job must never clobber it | läbis |
| 59 |  | [yvkehtivus] Verify final state — date set, xroad fields untouched (no clobbering) | `POST /ljvis/control-forms/vehicle-technical/get` | proceeding_closure_basis untouched (still null) | läbis |
| 60 |  | [yvkehtivus] Verify final state — date set, xroad fields untouched (no clobbering) | `POST /ljvis/control-forms/vehicle-technical/get` | version still 1 | läbis |
| 61 |  | [yvkehtivus] log_yvkehtivus_audit found=false — no audit row | `POST /ljvis/control-forms/vehicle-technical/log_yvkehtivus_audit` | Returns 200 | läbis |
| 62 |  | [yvkehtivus] log_yvkehtivus_audit found=false — no audit row | `POST /ljvis/control-forms/vehicle-technical/log_yvkehtivus_audit` | No audit event written | läbis |
| 63 |  | [yvkehtivus] log_yvkehtivus_audit found=true — audit event written | `POST /ljvis/control-forms/vehicle-technical/log_yvkehtivus_audit` | Returns 200 | läbis |
| 64 |  | [yvkehtivus] log_yvkehtivus_audit found=true — audit event written | `POST /ljvis/control-forms/vehicle-technical/log_yvkehtivus_audit` | Audit event written with an event_id | läbis |
| 65 |  | [Resilience Setup] Insert another confirmed candidate for the orchestrator run | `POST /ljvis/control-forms/labour-inspection/insert` | Returns 200 | läbis |
| 66 |  | [Resilience] cron/etoimik-decision-sync with XTR unreachable — no crash | `POST /ljvis/cron/etoimik-decision-sync` | Does not hang / returns some HTTP response | läbis |
| 67 |  | [Resilience] ruuter-internal is still alive after the failed run (regression: undefined-to-JSON panic used to kill the whole process) | `GET /health` | ruuter-internal /health still responds 200 | läbis |
| 68 |  | [Resilience] cron/yvkehtivus-sync with XTR unreachable — no crash | `POST /ljvis/cron/yvkehtivus-sync` | Does not hang / returns some HTTP response | läbis |
| 69 |  | [Resilience] ruuter-internal is still alive after the second failed run | `GET /health` | ruuter-internal /health still responds 200 | läbis |
| 70 |  | [risk-score-recalc Setup] Insert a published compound_form with a fresh reg code | `POST /ljvis/control-forms/compound-form/insert` | Returns 200 | läbis |
| 71 |  | [risk-score-recalc] select_companies_for_recalc — new company is a candidate | `POST /ljvis/risk_score/select_companies_for_recalc` | Returns 200 | läbis |
| 72 |  | [risk-score-recalc] select_companies_for_recalc — new company is a candidate | `POST /ljvis/risk_score/select_companies_for_recalc` | New company appears as a candidate | läbis |
| 73 |  | [risk-score-recalc] POST cron/risk-score-recalc-sync — full nightly run | `POST /ljvis/cron/risk-score-recalc-sync` | Returns 200 (no XTR dependency, unlike etoimik/yvkehtivus) | läbis |
| 74 |  | [risk-score-recalc] POST cron/risk-score-recalc-sync — full nightly run | `POST /ljvis/cron/risk-score-recalc-sync` | At least our one company was checked | läbis |
| 75 |  | [risk-score-recalc] POST cron/risk-score-recalc-sync — full nightly run | `POST /ljvis/cron/risk-score-recalc-sync` | No failures | läbis |
| 76 |  | [risk-score-recalc] Verify: our company got a saved score with calculation_trigger | `POST /ljvis/risk_score/get_current_risk_score` | Returns 200 | läbis |
| 77 |  | [risk-score-recalc] Verify: our company got a saved score with calculation_trigger | `POST /ljvis/risk_score/get_current_risk_score` | A score row exists | läbis |
| 78 |  | [risk-score-recalc] Verify: our company got a saved score with calculation_trigger | `POST /ljvis/risk_score/get_current_risk_score` | riskBandCode is Hall (no SP forms on this synthetic company) | läbis |
| 79 |  | [risk-score-recalc] Re-run — appends a NEW history row (insert-only, not a no-op) | `POST /ljvis/cron/risk-score-recalc-sync` | Returns 200 | läbis |
| 80 |  | [risk-score-recalc] Verify: created_at advanced (unlike the other 3 jobs, this one is NOT a resolve-once idempotency pattern) | `POST /ljvis/risk_score/get_current_risk_score` | Returns 200 | läbis |
| 81 |  | [risk-score-recalc] Verify: created_at advanced (unlike the other 3 jobs, this one is NOT a resolve-once idempotency pattern) | `POST /ljvis/risk_score/get_current_risk_score` | Latest row is newer than the first run — a new history row was appended | läbis |
| 82 |  | [risk-score-recalc] ruuter-internal is still alive after two runs | `GET /health` | ruuter-internal /health still responds 200 | läbis |
| 83 |  | [sp-driver e-toimik Setup] Insert compound_form with a driver personal code | `POST /ljvis/control-forms/compound-form/insert` | Returns 200 | läbis |
| 84 |  | [sp-driver e-toimik Setup] Insert confirmed sp_driver_form (candidate) | `POST /ljvis/control-forms/drive-rest-form/driver/insert` | Returns 200 | läbis |
| 85 |  | [sp-driver e-toimik] select_etoimik_candidates — new sub-form is a candidate | `POST /ljvis/control-forms/drive-rest-form/driver/select_etoimik_candidates` | Returns 200 | läbis |
| 86 |  | [sp-driver e-toimik] select_etoimik_candidates — new sub-form is a candidate | `POST /ljvis/control-forms/drive-rest-form/driver/select_etoimik_candidates` | Seeded sub-form appears as a candidate | läbis |
| 87 |  | [sp-driver e-toimik] select_etoimik_candidates — new sub-form is a candidate | `POST /ljvis/control-forms/drive-rest-form/driver/select_etoimik_candidates` | Candidate carries the driver personal code from compound_form drivers[0] | läbis |
| 88 |  | [sp-driver e-toimik] select_etoimik_candidates — new sub-form is a candidate | `POST /ljvis/control-forms/drive-rest-form/driver/select_etoimik_candidates` | Candidate carries the proceeding reference number | läbis |
| 89 |  | [sp-driver e-toimik] update-xroad-fields found=false — no-op (0 rows) | `POST /ljvis/control-forms/drive-rest-form/driver/update-xroad-fields` | Returns 200 | läbis |
| 90 |  | [sp-driver e-toimik] update-xroad-fields found=false — no-op (0 rows) | `POST /ljvis/control-forms/drive-rest-form/driver/update-xroad-fields` | found=false writes nothing | läbis |
| 91 |  | [sp-driver e-toimik] update-xroad-fields found=true — writes decision in place | `POST /ljvis/control-forms/drive-rest-form/driver/update-xroad-fields` | Returns 200 | läbis |
| 92 |  | [sp-driver e-toimik] update-xroad-fields found=true — writes decision in place | `POST /ljvis/control-forms/drive-rest-form/driver/update-xroad-fields` | Wrote exactly one row (in-place update on the latest confirmed snapshot) | läbis |
| 93 |  | [sp-driver e-toimik] select_etoimik_candidates — resolved sub-form no longer a candidate (regression) | `POST /ljvis/control-forms/drive-rest-form/driver/select_etoimik_candidates` | Returns 200 | läbis |
| 94 |  | [sp-driver e-toimik] select_etoimik_candidates — resolved sub-form no longer a candidate (regression) | `POST /ljvis/control-forms/drive-rest-form/driver/select_etoimik_candidates` | Regression: sub-form with enforcement_decision set drops out of the candidate list | läbis |
| 95 |  | [sp-driver e-toimik] update-xroad-fields again, same key — guarded no-op (enforcement_decision already set) | `POST /ljvis/control-forms/drive-rest-form/driver/update-xroad-fields` | Returns 200 | läbis |
| 96 |  | [sp-driver e-toimik] update-xroad-fields again, same key — guarded no-op (enforcement_decision already set) | `POST /ljvis/control-forms/drive-rest-form/driver/update-xroad-fields` | enforcement_decision IS NULL guard holds — no second write | läbis |
| 97 |  | [sp-driver e-toimik] Verify final state via get.sql (decision persisted, cron publishes) | `POST /ljvis/control-forms/drive-rest-form/driver/get` | Returns 200 | läbis |
| 98 |  | [sp-driver e-toimik] Verify final state via get.sql (decision persisted, cron publishes) | `POST /ljvis/control-forms/drive-rest-form/driver/get` | status is now published — the cron applies the decision and publishes, but does not bump the version | läbis |
| 99 |  | [sp-driver e-toimik] Verify final state via get.sql (decision persisted, cron publishes) | `POST /ljvis/control-forms/drive-rest-form/driver/get` | enforcement_decision persisted | läbis |
| 100 |  | [sp-driver e-toimik] Verify final state via get.sql (decision persisted, cron publishes) | `POST /ljvis/control-forms/drive-rest-form/driver/get` | proceeding_closure_basis persisted (first value, not the no-op attempt) | läbis |
| 101 |  | [sp-driver e-toimik] log_etoimik_sp_driver_audit found=false — no audit row | `POST /ljvis/control-forms/drive-rest-form/driver/log_etoimik_sp_driver_audit` | Returns 200 | läbis |
| 102 |  | [sp-driver e-toimik] log_etoimik_sp_driver_audit found=false — no audit row | `POST /ljvis/control-forms/drive-rest-form/driver/log_etoimik_sp_driver_audit` | No audit event written | läbis |
| 103 |  | [sp-driver e-toimik] log_etoimik_sp_driver_audit found=true — audit event written | `POST /ljvis/control-forms/drive-rest-form/driver/log_etoimik_sp_driver_audit` | Returns 200 | läbis |
| 104 |  | [sp-driver e-toimik] log_etoimik_sp_driver_audit found=true — audit event written | `POST /ljvis/control-forms/drive-rest-form/driver/log_etoimik_sp_driver_audit` | Audit event written with an event_id | läbis |
| 105 |  | [tram e-toimik Setup] Insert tram_control_card (saved) | `POST /ljvis/control-forms/tram-card/insert` | 200 | läbis |
| 106 |  | [tram e-toimik Setup] Confirm the card | `POST /ljvis/control-forms/tram-card/update` | 200 | läbis |
| 107 |  | [tram e-toimik Setup] Confirm the card | `POST /ljvis/control-forms/tram-card/update` | confirmed | läbis |
| 108 |  | [tram e-toimik] select_etoimik_candidates — confirmed card is a candidate | `POST /ljvis/control-forms/tram-card/select_etoimik_candidates` | 200 | läbis |
| 109 |  | [tram e-toimik] select_etoimik_candidates — confirmed card is a candidate | `POST /ljvis/control-forms/tram-card/select_etoimik_candidates` | card is a candidate | läbis |
| 110 |  | [tram e-toimik] select_etoimik_candidates — confirmed card is a candidate | `POST /ljvis/control-forms/tram-card/select_etoimik_candidates` | carries driver personal code | läbis |
| 111 |  | [tram e-toimik] select_etoimik_candidates — confirmed card is a candidate | `POST /ljvis/control-forms/tram-card/select_etoimik_candidates` | carries proceeding reference number | läbis |
| 112 |  | [tram e-toimik] apply_etoimik_decision found=false — no-op (0 rows) | `POST /ljvis/control-forms/tram-card/apply_etoimik_decision` | 200 | läbis |
| 113 |  | [tram e-toimik] apply_etoimik_decision found=false — no-op (0 rows) | `POST /ljvis/control-forms/tram-card/apply_etoimik_decision` | no rows | läbis |
| 114 |  | [tram e-toimik] apply_etoimik_decision found=true — publishes + writes decision | `POST /ljvis/control-forms/tram-card/apply_etoimik_decision` | 200 | läbis |
| 115 |  | [tram e-toimik] apply_etoimik_decision found=true — publishes + writes decision | `POST /ljvis/control-forms/tram-card/apply_etoimik_decision` | published | läbis |
| 116 |  | [tram e-toimik] select_etoimik_candidates — resolved card no longer a candidate (idempotency) | `POST /ljvis/control-forms/tram-card/select_etoimik_candidates` | 200 | läbis |
| 117 |  | [tram e-toimik] select_etoimik_candidates — resolved card no longer a candidate (idempotency) | `POST /ljvis/control-forms/tram-card/select_etoimik_candidates` | gone | läbis |
| 118 |  | [tram e-toimik] apply_etoimik_decision again, same key — guarded no-op (already published) | `POST /ljvis/control-forms/tram-card/apply_etoimik_decision` | 200 | läbis |
| 119 |  | [tram e-toimik] apply_etoimik_decision again, same key — guarded no-op (already published) | `POST /ljvis/control-forms/tram-card/apply_etoimik_decision` | no rows (status is already published) | läbis |
| 120 |  | [tram e-toimik] log_etoimik_publish_audit found=true — audit event written | `POST /ljvis/control-forms/tram-card/log_etoimik_publish_audit` | 200 | läbis |
| 121 |  | [tram e-toimik] log_etoimik_publish_audit found=true — audit event written | `POST /ljvis/control-forms/tram-card/log_etoimik_publish_audit` | event_id returned | läbis |
| 122 |  | [tram e-toimik] log_etoimik_publish_audit found=false — no audit row | `POST /ljvis/control-forms/tram-card/log_etoimik_publish_audit` | 200 | läbis |
| 123 |  | [tram e-toimik] log_etoimik_publish_audit found=false — no audit row | `POST /ljvis/control-forms/tram-card/log_etoimik_publish_audit` | no rows | läbis |
| 124 |  | [Resilience] cron/etoimik-tram-decision-sync with XTR unreachable — no crash | `POST /ljvis/cron/etoimik-tram-decision-sync` | Does not hang / returns some HTTP response | läbis |
| 125 |  | [Resilience] ruuter-internal still alive after the TRAM sync run | `GET /health` | ruuter-internal responds | läbis |
| 126 |  | [technical-check e-toimik Setup] Insert compound_form with a driver + 2 trailers | `POST /ljvis/control-forms/compound-form/insert` | Returns 200 | läbis |
| 127 |  | [technical-check e-toimik Setup] Insert confirmed vehicle_technical_form (candidate) | `POST /ljvis/control-forms/vehicle-technical/insert` | Returns 200 | läbis |
| 128 |  | [technical-check e-toimik Setup] Insert confirmed trailer_technical_form (candidate) | `POST /ljvis/control-forms/trailer-technical/insert` | Returns 200 | läbis |
| 129 |  | [vehicle-technical e-toimik] select_etoimik_candidates — new sub-form is a candidate | `POST /ljvis/control-forms/vehicle-technical/select_etoimik_candidates` | Returns 200 | läbis |
| 130 |  | [vehicle-technical e-toimik] select_etoimik_candidates — new sub-form is a candidate | `POST /ljvis/control-forms/vehicle-technical/select_etoimik_candidates` | Seeded sub-form appears as a candidate | läbis |
| 131 |  | [vehicle-technical e-toimik] select_etoimik_candidates — new sub-form is a candidate | `POST /ljvis/control-forms/vehicle-technical/select_etoimik_candidates` | Candidate carries the driver personal code from compound_form drivers[0] | läbis |
| 132 |  | [vehicle-technical e-toimik] select_etoimik_candidates — new sub-form is a candidate | `POST /ljvis/control-forms/vehicle-technical/select_etoimik_candidates` | Candidate carries the proceeding reference number | läbis |
| 133 |  | [vehicle-technical e-toimik] update-xroad-fields found=false — no-op (0 rows) | `POST /ljvis/control-forms/vehicle-technical/update-xroad-fields` | Returns 200 | läbis |
| 134 |  | [vehicle-technical e-toimik] update-xroad-fields found=false — no-op (0 rows) | `POST /ljvis/control-forms/vehicle-technical/update-xroad-fields` | found=false writes nothing | läbis |
| 135 |  | [vehicle-technical e-toimik] update-xroad-fields found=true — writes decision in place | `POST /ljvis/control-forms/vehicle-technical/update-xroad-fields` | Returns 200 | läbis |
| 136 |  | [vehicle-technical e-toimik] update-xroad-fields found=true — writes decision in place | `POST /ljvis/control-forms/vehicle-technical/update-xroad-fields` | Wrote exactly one row (in-place update on the latest confirmed snapshot) | läbis |
| 137 |  | [vehicle-technical e-toimik] select_etoimik_candidates — resolved sub-form no longer a candidate (regression) | `POST /ljvis/control-forms/vehicle-technical/select_etoimik_candidates` | Returns 200 | läbis |
| 138 |  | [vehicle-technical e-toimik] select_etoimik_candidates — resolved sub-form no longer a candidate (regression) | `POST /ljvis/control-forms/vehicle-technical/select_etoimik_candidates` | Regression: sub-form with enforcement_decision set drops out of the candidate list | läbis |
| 139 |  | [vehicle-technical e-toimik] update-xroad-fields again, same key — guarded no-op (enforcement_decision already set) | `POST /ljvis/control-forms/vehicle-technical/update-xroad-fields` | Returns 200 | läbis |
| 140 |  | [vehicle-technical e-toimik] update-xroad-fields again, same key — guarded no-op (enforcement_decision already set) | `POST /ljvis/control-forms/vehicle-technical/update-xroad-fields` | enforcement_decision IS NULL guard holds — no second write | läbis |
| 141 |  | [vehicle-technical e-toimik] Verify final state via get.sql (decision persisted, cron publishes) | `POST /ljvis/control-forms/vehicle-technical/get` | Returns 200 | läbis |
| 142 |  | [vehicle-technical e-toimik] Verify final state via get.sql (decision persisted, cron publishes) | `POST /ljvis/control-forms/vehicle-technical/get` | status is now published — the cron applies the decision and publishes, but does not bump the version | läbis |
| 143 |  | [vehicle-technical e-toimik] Verify final state via get.sql (decision persisted, cron publishes) | `POST /ljvis/control-forms/vehicle-technical/get` | enforcement_decision persisted | läbis |
| 144 |  | [vehicle-technical e-toimik] Verify final state via get.sql (decision persisted, cron publishes) | `POST /ljvis/control-forms/vehicle-technical/get` | proceeding_closure_basis persisted (first value, not the no-op attempt) | läbis |
| 145 |  | [vehicle-technical e-toimik] log_etoimik_xroad_audit found=false — no audit row | `POST /ljvis/control-forms/vehicle-technical/log_etoimik_xroad_audit` | Returns 200 | läbis |
| 146 |  | [vehicle-technical e-toimik] log_etoimik_xroad_audit found=false — no audit row | `POST /ljvis/control-forms/vehicle-technical/log_etoimik_xroad_audit` | No audit event written | läbis |
| 147 |  | [vehicle-technical e-toimik] log_etoimik_xroad_audit found=true — audit event written | `POST /ljvis/control-forms/vehicle-technical/log_etoimik_xroad_audit` | Returns 200 | läbis |
| 148 |  | [vehicle-technical e-toimik] log_etoimik_xroad_audit found=true — audit event written | `POST /ljvis/control-forms/vehicle-technical/log_etoimik_xroad_audit` | Audit event written with an event_id | läbis |
| 149 |  | [trailer-technical e-toimik] select_etoimik_candidates — new sub-form is a candidate | `POST /ljvis/control-forms/trailer-technical/select_etoimik_candidates` | Returns 200 | läbis |
| 150 |  | [trailer-technical e-toimik] select_etoimik_candidates — new sub-form is a candidate | `POST /ljvis/control-forms/trailer-technical/select_etoimik_candidates` | Seeded sub-form appears as a candidate | läbis |
| 151 |  | [trailer-technical e-toimik] select_etoimik_candidates — new sub-form is a candidate | `POST /ljvis/control-forms/trailer-technical/select_etoimik_candidates` | Candidate carries the driver personal code from compound_form drivers[0] | läbis |
| 152 |  | [trailer-technical e-toimik] select_etoimik_candidates — new sub-form is a candidate | `POST /ljvis/control-forms/trailer-technical/select_etoimik_candidates` | Candidate carries the proceeding reference number | läbis |
| 153 |  | [trailer-technical e-toimik] update-xroad-fields found=false — no-op (0 rows) | `POST /ljvis/control-forms/trailer-technical/update-xroad-fields` | Returns 200 | läbis |
| 154 |  | [trailer-technical e-toimik] update-xroad-fields found=false — no-op (0 rows) | `POST /ljvis/control-forms/trailer-technical/update-xroad-fields` | found=false writes nothing | läbis |
| 155 |  | [trailer-technical e-toimik] update-xroad-fields found=true — writes decision in place | `POST /ljvis/control-forms/trailer-technical/update-xroad-fields` | Returns 200 | läbis |
| 156 |  | [trailer-technical e-toimik] update-xroad-fields found=true — writes decision in place | `POST /ljvis/control-forms/trailer-technical/update-xroad-fields` | Wrote exactly one row (in-place update on the latest confirmed snapshot) | läbis |
| 157 |  | [trailer-technical e-toimik] select_etoimik_candidates — resolved sub-form no longer a candidate (regression) | `POST /ljvis/control-forms/trailer-technical/select_etoimik_candidates` | Returns 200 | läbis |
| 158 |  | [trailer-technical e-toimik] select_etoimik_candidates — resolved sub-form no longer a candidate (regression) | `POST /ljvis/control-forms/trailer-technical/select_etoimik_candidates` | Regression: sub-form with enforcement_decision set drops out of the candidate list | läbis |
| 159 |  | [trailer-technical e-toimik] update-xroad-fields again, same key — guarded no-op (enforcement_decision already set) | `POST /ljvis/control-forms/trailer-technical/update-xroad-fields` | Returns 200 | läbis |
| 160 |  | [trailer-technical e-toimik] update-xroad-fields again, same key — guarded no-op (enforcement_decision already set) | `POST /ljvis/control-forms/trailer-technical/update-xroad-fields` | enforcement_decision IS NULL guard holds — no second write | läbis |
| 161 |  | [trailer-technical e-toimik] Verify final state via get.sql (decision persisted, cron publishes) | `POST /ljvis/control-forms/trailer-technical/get` | Returns 200 | läbis |
| 162 |  | [trailer-technical e-toimik] Verify final state via get.sql (decision persisted, cron publishes) | `POST /ljvis/control-forms/trailer-technical/get` | status is now published — the cron applies the decision and publishes, but does not bump the version | läbis |
| 163 |  | [trailer-technical e-toimik] Verify final state via get.sql (decision persisted, cron publishes) | `POST /ljvis/control-forms/trailer-technical/get` | enforcement_decision persisted | läbis |
| 164 |  | [trailer-technical e-toimik] Verify final state via get.sql (decision persisted, cron publishes) | `POST /ljvis/control-forms/trailer-technical/get` | proceeding_closure_basis persisted (first value, not the no-op attempt) | läbis |
| 165 |  | [trailer-technical e-toimik] log_etoimik_xroad_audit found=false — no audit row | `POST /ljvis/control-forms/trailer-technical/log_etoimik_xroad_audit` | Returns 200 | läbis |
| 166 |  | [trailer-technical e-toimik] log_etoimik_xroad_audit found=false — no audit row | `POST /ljvis/control-forms/trailer-technical/log_etoimik_xroad_audit` | No audit event written | läbis |
| 167 |  | [trailer-technical e-toimik] log_etoimik_xroad_audit found=true — audit event written | `POST /ljvis/control-forms/trailer-technical/log_etoimik_xroad_audit` | Returns 200 | läbis |
| 168 |  | [trailer-technical e-toimik] log_etoimik_xroad_audit found=true — audit event written | `POST /ljvis/control-forms/trailer-technical/log_etoimik_xroad_audit` | Audit event written with an event_id | läbis |
| 169 |  | [Resilience] cron/etoimik-technical-check-decision-sync with XTR unreachable — no crash | `POST /ljvis/cron/etoimik-technical-check-decision-sync` | Does not hang / returns some HTTP response | läbis |
| 170 |  | [Resilience] ruuter-internal still alive after the technical-check sync run | `GET /health` | ruuter-internal /health still responds 200 | läbis |
| 171 |  | [trailer-technical yvkehtivus Setup] Insert confirmed trailer_technical_form (extraordinary_inspection) matching trailer #1 | `POST /ljvis/control-forms/trailer-technical/insert` | Returns 200 | läbis |
| 172 |  | [trailer-technical yvkehtivus] select_yvkehtivus_candidates — new sub-form is a candidate (matches own trailer via trailer_reg_nr) | `POST /ljvis/control-forms/trailer-technical/select_yvkehtivus_candidates` | Returns 200 | läbis |
| 173 |  | [trailer-technical yvkehtivus] select_yvkehtivus_candidates — new sub-form is a candidate (matches own trailer via trailer_reg_nr) | `POST /ljvis/control-forms/trailer-technical/select_yvkehtivus_candidates` | Seeded sub-form appears as a candidate | läbis |
| 174 |  | [trailer-technical yvkehtivus] select_yvkehtivus_candidates — new sub-form is a candidate (matches own trailer via trailer_reg_nr) | `POST /ljvis/control-forms/trailer-technical/select_yvkehtivus_candidates` | Candidate carries the trailer_reg_nr as the registration number | läbis |
| 175 |  | [trailer-technical yvkehtivus] update-extraordinary-inspection-date, empty date — no-op (0 rows) | `POST /ljvis/control-forms/trailer-technical/update-extraordinary-inspection-date` | Returns 200 | läbis |
| 176 |  | [trailer-technical yvkehtivus] update-extraordinary-inspection-date, empty date — no-op (0 rows) | `POST /ljvis/control-forms/trailer-technical/update-extraordinary-inspection-date` | Empty date writes nothing | läbis |
| 177 |  | [trailer-technical yvkehtivus] update-extraordinary-inspection-date, real date — writes in place | `POST /ljvis/control-forms/trailer-technical/update-extraordinary-inspection-date` | Returns 200 | läbis |
| 178 |  | [trailer-technical yvkehtivus] update-extraordinary-inspection-date, real date — writes in place | `POST /ljvis/control-forms/trailer-technical/update-extraordinary-inspection-date` | Wrote exactly one row | läbis |
| 179 |  | [trailer-technical yvkehtivus] update-extraordinary-inspection-date, real date — writes in place | `POST /ljvis/control-forms/trailer-technical/update-extraordinary-inspection-date` | version stays 1 — in-place update, not a new snapshot | läbis |
| 180 |  | [trailer-technical yvkehtivus] select_yvkehtivus_candidates — resolved sub-form no longer a candidate | `POST /ljvis/control-forms/trailer-technical/select_yvkehtivus_candidates` | Returns 200 | läbis |
| 181 |  | [trailer-technical yvkehtivus] select_yvkehtivus_candidates — resolved sub-form no longer a candidate | `POST /ljvis/control-forms/trailer-technical/select_yvkehtivus_candidates` | Resolved sub-form does not reappear | läbis |
| 182 |  | [trailer-technical yvkehtivus] update-extraordinary-inspection-date again, same key — idempotent no-op | `POST /ljvis/control-forms/trailer-technical/update-extraordinary-inspection-date` | Returns 200 | läbis |
| 183 |  | [trailer-technical yvkehtivus] update-extraordinary-inspection-date again, same key — idempotent no-op | `POST /ljvis/control-forms/trailer-technical/update-extraordinary-inspection-date` | Already-resolved sub-form is not overwritten again | läbis |
| 184 |  | [trailer-technical yvkehtivus] Verify final state — date set, xroad fields untouched (no clobbering) | `POST /ljvis/control-forms/trailer-technical/get` | Returns 200 | läbis |
| 185 |  | [trailer-technical yvkehtivus] Verify final state — date set, xroad fields untouched (no clobbering) | `POST /ljvis/control-forms/trailer-technical/get` | extraordinary_inspection_date is the FIRST value written, not the second no-op attempt | läbis |
| 186 |  | [trailer-technical yvkehtivus] Verify final state — date set, xroad fields untouched (no clobbering) | `POST /ljvis/control-forms/trailer-technical/get` | enforcement_decision untouched (still null) — this job must never clobber it | läbis |
| 187 |  | [trailer-technical yvkehtivus] Verify final state — date set, xroad fields untouched (no clobbering) | `POST /ljvis/control-forms/trailer-technical/get` | proceeding_closure_basis untouched (still null) | läbis |
| 188 |  | [trailer-technical yvkehtivus] Verify final state — date set, xroad fields untouched (no clobbering) | `POST /ljvis/control-forms/trailer-technical/get` | version still 1 | läbis |
| 189 |  | [trailer-technical yvkehtivus] log_yvkehtivus_audit found=false — no audit row | `POST /ljvis/control-forms/trailer-technical/log_yvkehtivus_audit` | Returns 200 | läbis |
| 190 |  | [trailer-technical yvkehtivus] log_yvkehtivus_audit found=false — no audit row | `POST /ljvis/control-forms/trailer-technical/log_yvkehtivus_audit` | No audit event written | läbis |
| 191 |  | [trailer-technical yvkehtivus] log_yvkehtivus_audit found=true — audit event written | `POST /ljvis/control-forms/trailer-technical/log_yvkehtivus_audit` | Returns 200 | läbis |
| 192 |  | [trailer-technical yvkehtivus] log_yvkehtivus_audit found=true — audit event written | `POST /ljvis/control-forms/trailer-technical/log_yvkehtivus_audit` | Audit event written with an event_id | läbis |
| 193 |  | [archive Setup] Insert labour_inspection_form (saved) | `POST /ljvis/control-forms/labour-inspection/insert` | 200 | läbis |
| 194 |  | [archive Setup] Soft-delete it (writes deleted tombstone) | `POST /ljvis/control-forms/labour-inspection/delete` | 200 | läbis |
| 195 |  | [archive] get-snapshots BEFORE archival — from forms.* (work DB) | `POST /ljvis/control-forms/labour-inspection/get-snapshots` | 200 | läbis |
| 196 |  | [archive] get-snapshots BEFORE archival — from forms.* (work DB) | `POST /ljvis/control-forms/labour-inspection/get-snapshots` | &gt;=1 snapshot before archival | läbis |
| 197 |  | [archive] POST cron/archive-deleted-forms — copy -&gt; verify -&gt; real delete | `POST /ljvis/cron/archive-deleted-forms` | 200 | läbis |
| 198 |  | [archive] POST cron/archive-deleted-forms — copy -&gt; verify -&gt; real delete | `POST /ljvis/cron/archive-deleted-forms` | copied &gt;= 2 (saved + deleted snapshots) | läbis |
| 199 |  | [archive] POST cron/archive-deleted-forms — copy -&gt; verify -&gt; real delete | `POST /ljvis/cron/archive-deleted-forms` | verified == copied | läbis |
| 200 |  | [archive] POST cron/archive-deleted-forms — copy -&gt; verify -&gt; real delete | `POST /ljvis/cron/archive-deleted-forms` | purged &gt;= 2 (real delete happened) | läbis |
| 201 |  | [archive] get-snapshots AFTER archival — served from archive DB | `POST /arhiiv/deleted-forms/get_snapshots` | 200 | läbis |
| 202 |  | [archive] get-snapshots AFTER archival — served from archive DB | `POST /arhiiv/deleted-forms/get_snapshots` | history retrievable from archive after purge | läbis |
| 203 |  | [archive] get_snapshot direct from archive DB — payload present | `POST /arhiiv/deleted-forms/get_snapshot` | 200 | läbis |
| 204 |  | [archive] get_snapshot direct from archive DB — payload present | `POST /arhiiv/deleted-forms/get_snapshot` | payload object | läbis |
| 205 |  | [archive] get_snapshot direct from archive DB — payload present | `POST /arhiiv/deleted-forms/get_snapshot` | payload has form_number | läbis |
| 206 |  | [archive] cron re-run — nothing left to copy/purge (idempotent) | `POST /ljvis/cron/archive-deleted-forms` | 200 | läbis |
| 207 |  | [archive] cron re-run — nothing left to copy/purge (idempotent) | `POST /ljvis/cron/archive-deleted-forms` | copied 0 | läbis |
| 208 |  | [archive] cron re-run — nothing left to copy/purge (idempotent) | `POST /ljvis/cron/archive-deleted-forms` | purged 0 | läbis |
| 209 |  | [archive] ruuter-internal still alive | `GET /health` | alive | läbis |
| 210 |  | [NCR autodispatch] select-autodispatch-candidates — published KORRAS foreign-vehicle sub-form is a candidate | `POST /ljvis/erru/ncr/select-autodispatch-candidates` | Returns 200 | läbis |
| 211 |  | [NCR autodispatch] select-autodispatch-candidates — published KORRAS foreign-vehicle sub-form is a candidate | `POST /ljvis/erru/ncr/select-autodispatch-candidates` | Fixture sub-form 900011 appears as a candidate | läbis |
| 212 |  | [NCR autodispatch] select-autodispatch-candidates — published KORRAS foreign-vehicle sub-form is a candidate | `POST /ljvis/erru/ncr/select-autodispatch-candidates` | ncrTo resolved from vehicle country (DE) | läbis |
| 213 |  | [NCR autodispatch] POST cron/erru-ncr-autodispatch — nightly run dispatches the NCR | `POST /ljvis/cron/erru-ncr-autodispatch` | Returns 200 | läbis |
| 214 |  | [NCR autodispatch] POST cron/erru-ncr-autodispatch — nightly run dispatches the NCR | `POST /ljvis/cron/erru-ncr-autodispatch` | At least one NCR acknowledged | läbis |
| 215 |  | [NCR autodispatch] POST cron/erru-ncr-autodispatch — nightly run dispatches the NCR | `POST /ljvis/cron/erru-ncr-autodispatch` | No build failures | läbis |
| 216 |  | [NCR autodispatch] select-autodispatch-candidates — dispatched sub-form no longer a candidate (idempotent) | `POST /ljvis/erru/ncr/select-autodispatch-candidates` | Returns 200 | läbis |
| 217 |  | [NCR autodispatch] select-autodispatch-candidates — dispatched sub-form no longer a candidate (idempotent) | `POST /ljvis/erru/ncr/select-autodispatch-candidates` | Fixture sub-form dropped out after dispatch | läbis |
| 218 |  | [NCR autodispatch] Re-run cron — fixture sub-form is not re-dispatched | `POST /ljvis/cron/erru-ncr-autodispatch` | Returns 200 | läbis |
| 219 |  | [NCR autodispatch] Re-run cron — fixture sub-form is not re-dispatched | `POST /ljvis/cron/erru-ncr-autodispatch` | Nothing acknowledged on the second run | läbis |
| 220 |  | [NCR autodispatch] ruuter-internal still alive after the runs | `GET /health` | ruuter-internal healthy | läbis |

### 27. notifications

**Teavitused ja Postkast** · testitüübid: funktsionaalne, integratsioon, töökindlus · kollektsioon `tests/postman/collections/notifications.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 |  | [Auth] Login — Super Admin (has notification.list) | `POST /ljvis/auth/dev/dev-login` | Login 200 | läbis |
| 2 |  | [Auth] Login — Super Admin (has notification.list) | `POST /ljvis/auth/dev/dev-login` | JWT received | läbis |
| 3 |  | [Auth] Login — Officer (registered, no notification.list / ncr.read) | `POST /ljvis/auth/dev/dev-login` | Login 200 | läbis |
| 4 |  | [Setup] Seed in-app notification A (ncr.read) | `POST /ljvis/notification/insert_notification` | 200 | läbis |
| 5 |  | [Setup] Seed in-app notification A (ncr.read) | `POST /ljvis/notification/insert_notification` | returns id | läbis |
| 6 |  | [Setup] Seed in-app notification B (notification.list) | `POST /ljvis/notification/insert_notification` | 200 | läbis |
| 7 |  | [Setup] insert_notification idempotency — re-seed A returns no new row | `POST /ljvis/notification/insert_notification` | 200 | läbis |
| 8 |  | [Setup] insert_notification idempotency — re-seed A returns no new row | `POST /ljvis/notification/insert_notification` | ON CONFLICT DO NOTHING — no row returned | läbis |
| 9 |  | [internal] POST notification/create — 200 + id | `POST /ljvis/notification/create` | 200 | läbis |
| 10 |  | [internal] POST notification/create — 200 + id | `POST /ljvis/notification/create` | created with an id | läbis |
| 11 |  | [internal] POST notification/create — empty title_et → 400 | `POST /ljvis/notification/create` | 400 (required-field validation) | läbis |
| 12 |  | GET /v1/notifications/list — no cookie → 401 | `GET /ljvis/v1/notifications/list` | 401 without auth | läbis |
| 13 |  | GET /v1/notifications/list — admin → 200, sees ncr.read notification, unread | `GET /ljvis/v1/notifications/list` | 200 | läbis |
| 14 |  | GET /v1/notifications/list — admin → 200, sees ncr.read notification, unread | `GET /ljvis/v1/notifications/list` | list is an array | läbis |
| 15 |  | GET /v1/notifications/list — admin → 200, sees ncr.read notification, unread | `GET /ljvis/v1/notifications/list` | notification A present (ncr.read in admin permissions) | läbis |
| 16 |  | GET /v1/notifications/list — admin → 200, sees ncr.read notification, unread | `GET /ljvis/v1/notifications/list` | A is unread | läbis |
| 17 |  | GET /v1/notifications/list — officer → 200, empty (no matching required_permission) | `GET /ljvis/v1/notifications/list` | 200 (auth only) | läbis |
| 18 |  | GET /v1/notifications/list — officer → 200, empty (no matching required_permission) | `GET /ljvis/v1/notifications/list` | nothing visible without a matching required_permission | läbis |
| 19 |  | GET /v1/notifications/unread-count — no cookie → 401 | `GET /ljvis/v1/notifications/unread-count` | 401 | läbis |
| 20 |  | GET /v1/notifications/unread-count — admin → 200, count &gt;= 2 | `GET /ljvis/v1/notifications/unread-count` | 200 | läbis |
| 21 |  | GET /v1/notifications/unread-count — admin → 200, count &gt;= 2 | `GET /ljvis/v1/notifications/unread-count` | unreadCount numeric | läbis |
| 22 |  | GET /v1/notifications/unread-count — admin → 200, count &gt;= 2 | `GET /ljvis/v1/notifications/unread-count` | &gt;= 2 (A + C, both ncr.read) | läbis |
| 23 |  | POST /v1/notifications/mark-read — no cookie → 401 | `POST /ljvis/v1/notifications/mark-read` | 401 | läbis |
| 24 |  | POST /v1/notifications/mark-read — missing id → 400 | `POST /ljvis/v1/notifications/mark-read` | 400 | läbis |
| 25 |  | POST /v1/notifications/mark-read — admin → 200 | `POST /ljvis/v1/notifications/mark-read` | 200 | läbis |
| 26 |  | POST /v1/notifications/mark-read again — idempotent 200 | `POST /ljvis/v1/notifications/mark-read` | 200 (ON CONFLICT DO NOTHING) | läbis |
| 27 |  | GET /v1/notifications/list — admin → A now read | `GET /ljvis/v1/notifications/list` | 200 | läbis |
| 28 |  | GET /v1/notifications/list — admin → A now read | `GET /ljvis/v1/notifications/list` | A present | läbis |
| 29 |  | GET /v1/notifications/list — admin → A now read | `GET /ljvis/v1/notifications/list` | A is read now | läbis |
| 30 |  | GET /v1/notifications/unread-count — admin → decreased by 1 | `GET /ljvis/v1/notifications/unread-count` | 200 | läbis |
| 31 |  | GET /v1/notifications/unread-count — admin → decreased by 1 | `GET /ljvis/v1/notifications/unread-count` | count = before - 1 | läbis |
| 32 |  | POST /v1/notifications/mark-all-read — admin → 200, marks the rest | `POST /ljvis/v1/notifications/mark-all-read` | 200 | läbis |
| 33 |  | POST /v1/notifications/mark-all-read — admin → 200, marks the rest | `POST /ljvis/v1/notifications/mark-all-read` | markedCount &gt;= 1 | läbis |
| 34 |  | GET /v1/notifications/unread-count — admin → 0 after mark-all-read | `GET /ljvis/v1/notifications/unread-count` | 200 | läbis |
| 35 |  | GET /v1/notifications/unread-count — admin → 0 after mark-all-read | `GET /ljvis/v1/notifications/unread-count` | unreadCount = 0 | läbis |
| 36 |  | POST /v1/notifications/mark-all-read — admin again → 200, markedCount 0 | `POST /ljvis/v1/notifications/mark-all-read` | 200 | läbis |
| 37 |  | POST /v1/notifications/mark-all-read — admin again → 200, markedCount 0 | `POST /ljvis/v1/notifications/mark-all-read` | nothing left to mark | läbis |
| 38 |  | [Setup] Seed outbound_log row (error) | `POST /ljvis/notification/insert_outbound_log` | 200 | läbis |
| 39 |  | [Setup] Seed outbound_log row (error) | `POST /ljvis/notification/insert_outbound_log` | returns id | läbis |
| 40 |  | [Setup] Seed outbound_log recipient | `POST /ljvis/notification/insert_outbound_recipient` | 200 | läbis |
| 41 |  | GET /v1/notifications/outbound-log/list — officer (no notification.list) → 403 | `GET /ljvis/v1/notifications/outbound-log/list` | 403 without notification.list | läbis |
| 42 |  | GET /v1/notifications/outbound-log/list — no cookie → 401 | `GET /ljvis/v1/notifications/outbound-log/list` | 401 | läbis |
| 43 |  | GET /v1/notifications/outbound-log/list — admin → 200, contains seeded row | `GET /ljvis/v1/notifications/outbound-log/list` | 200 (admin has notification.list) | läbis |
| 44 |  | GET /v1/notifications/outbound-log/list — admin → 200, contains seeded row | `GET /ljvis/v1/notifications/outbound-log/list` | seeded outbound_log row present | läbis |
| 45 |  | GET /v1/notifications/outbound-log/list — admin → 200, contains seeded row | `GET /ljvis/v1/notifications/outbound-log/list` | seeded row status is error | läbis |
| 46 |  | GET /v1/notifications/outbound-log/list?status=bogus — admin → 200 empty | `GET /ljvis/v1/notifications/outbound-log/list` | 200 | läbis |
| 47 |  | GET /v1/notifications/outbound-log/list?status=bogus — admin → 200 empty | `GET /ljvis/v1/notifications/outbound-log/list` | filter excludes everything | läbis |
| 48 |  | GET /v1/notifications/outbound-log/recipients — missing q → 400 | `GET /ljvis/v1/notifications/outbound-log/recipients` | 400 | läbis |
| 49 |  | GET /v1/notifications/outbound-log/recipients — officer → 403 | `GET /ljvis/v1/notifications/outbound-log/recipients` | 403 | läbis |
| 50 |  | GET /v1/notifications/outbound-log/recipients?q= — admin → 200, seeded recipient | `GET /ljvis/v1/notifications/outbound-log/recipients` | 200 | läbis |
| 51 |  | GET /v1/notifications/outbound-log/recipients?q= — admin → 200, seeded recipient | `GET /ljvis/v1/notifications/outbound-log/recipients` | one recipient | läbis |
| 52 |  | GET /v1/notifications/outbound-log/recipients?q= — admin → 200, seeded recipient | `GET /ljvis/v1/notifications/outbound-log/recipients` | personEmail matches seed | läbis |
| 53 |  | POST .../outbound-log/resend/send — officer (no notification.resend) → 403 | `POST /ljvis/v1/notifications/outbound-log/resend/send` | 403 without notification.list | läbis |
| 54 |  | POST /v1/notifications/resend — missing logId → 400 | `POST /ljvis/v1/notifications/outbound-log/resend/send` | 400 | läbis |
| 55 |  | POST /v1/notifications/outbound-log/resend — admin → 200 (PK 2.0 mock) | `POST /ljvis/v1/notifications/outbound-log/resend/send` | 200 (send-postkast returns mock success) | läbis |
| 56 |  | POST /v1/notifications/outbound-log/resend — admin → 200 (PK 2.0 mock) | `POST /ljvis/v1/notifications/outbound-log/resend/send` | mock PK sending_operation_id returned | läbis |
| 57 |  | GET /v1/notifications/outbound-log/list — admin → resend appended a new row, original untouched | `GET /ljvis/v1/notifications/outbound-log/list` | 200 | läbis |
| 58 |  | GET /v1/notifications/outbound-log/list — admin → resend appended a new row, original untouched | `GET /ljvis/v1/notifications/outbound-log/list` | original row still present and unchanged (append-only) | läbis |
| 59 |  | GET /v1/notifications/outbound-log/list — admin → resend appended a new row, original untouched | `GET /ljvis/v1/notifications/outbound-log/list` | a resend row referencing the original exists | läbis |

### 28. audit-log

**Auditilogi** · testitüübid: funktsionaalne, turve · kollektsioon `tests/postman/collections/audit-log.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 |  | [Auth] Login — Super Admin (audit.read) | `POST /ljvis/auth/dev/dev-login` | 200 | läbis |
| 2 |  | [Auth] Login — Org Admin (audit.read.local, org JUM) | `POST /ljvis/auth/dev/dev-login` | 200 | läbis |
| 3 |  | [Auth] Login — Officer (no audit permission) | `POST /ljvis/auth/dev/dev-login` | 200 | läbis |
| 4 |  | [Setup] Resolve JUM + PPA organisation ids | `POST /ljvis/organisation/list_organisations` | 200 | läbis |
| 5 |  | [Setup] Resolve JUM + PPA organisation ids | `POST /ljvis/organisation/list_organisations` | JUM + PPA present | läbis |
| 6 |  | [Setup] Seed audit event in JUM org | `POST /ljvis/log/insert_audit_event` | 200 | läbis |
| 7 |  | [Setup] Seed audit event in PPA org | `POST /ljvis/log/insert_audit_event` | 200 | läbis |
| 8 |  | [Setup] Seed audit event with no organisation (system) | `POST /ljvis/log/insert_audit_event` | 200 | läbis |
| 9 |  | GET /v1/logs — no cookie → 401 | `GET /ljvis/v1/logs` | 401 | läbis |
| 10 |  | GET /v1/logs — officer (no audit perm) → 403 | `GET /ljvis/v1/logs` | 403 without audit.read / audit.read.local | läbis |
| 11 |  | GET /v1/logs?search=AUDITCI — Super Admin → 200, sees all 3 (JUM + PPA + system) | `GET /ljvis/v1/logs` | 200 | läbis |
| 12 |  | GET /v1/logs?search=AUDITCI — Super Admin → 200, sees all 3 (JUM + PPA + system) | `GET /ljvis/v1/logs` | sees JUM event | läbis |
| 13 |  | GET /v1/logs?search=AUDITCI — Super Admin → 200, sees all 3 (JUM + PPA + system) | `GET /ljvis/v1/logs` | sees PPA event | läbis |
| 14 |  | GET /v1/logs?search=AUDITCI — Super Admin → 200, sees all 3 (JUM + PPA + system) | `GET /ljvis/v1/logs` | sees system event | läbis |
| 15 |  | GET /v1/logs?search=AUDITCI — Org Admin (audit.read.local) → 200, sees ONLY own-org (JUM) | `GET /ljvis/v1/logs` | 200 | läbis |
| 16 |  | GET /v1/logs?search=AUDITCI — Org Admin (audit.read.local) → 200, sees ONLY own-org (JUM) | `GET /ljvis/v1/logs` | sees own-org (JUM) event | läbis |
| 17 |  | GET /v1/logs?search=AUDITCI — Org Admin (audit.read.local) → 200, sees ONLY own-org (JUM) | `GET /ljvis/v1/logs` | does NOT see PPA event | läbis |
| 18 |  | GET /v1/logs?search=AUDITCI — Org Admin (audit.read.local) → 200, sees ONLY own-org (JUM) | `GET /ljvis/v1/logs` | does NOT see system (no-org) event | läbis |
| 19 |  | GET /v1/logs/log?q=&lt;JUM event&gt; — Org Admin → 200, own-org event visible | `GET /ljvis/v1/logs/log` | 200 | läbis |
| 20 |  | GET /v1/logs/log?q=&lt;JUM event&gt; — Org Admin → 200, own-org event visible | `GET /ljvis/v1/logs/log` | event returned | läbis |
| 21 |  | GET /v1/logs/log?q=&lt;PPA event&gt; — Org Admin → empty (other org, out of scope) | `GET /ljvis/v1/logs/log` | 200 | läbis |
| 22 |  | GET /v1/logs/log?q=&lt;PPA event&gt; — Org Admin → empty (other org, out of scope) | `GET /ljvis/v1/logs/log` | other-org event not returned | läbis |
| 23 |  | GET /v1/logs/log?q=&lt;PPA event&gt; — Super Admin → 200, any-org event visible | `GET /ljvis/v1/logs/log` | 200 | läbis |
| 24 |  | GET /v1/logs/log?q=&lt;PPA event&gt; — Super Admin → 200, any-org event visible | `GET /ljvis/v1/logs/log` | event returned | läbis |
| 25 |  | GET /v1/logs/verify — officer → 403 | `GET /ljvis/v1/logs/verify` | 403 | läbis |
| 26 |  | GET /v1/logs/verify — Org Admin (audit.read.local only, no audit.verify) → 403 | `GET /ljvis/v1/logs/verify` | 403 — verify requires audit.verify (Super Admin only) | läbis |
| 27 |  | GET /v1/logs/verify — Super Admin → 200 | `GET /ljvis/v1/logs/verify` | 200 | läbis |
| 28 |  | GET /v1/logs/verify — Super Admin → 200 | `GET /ljvis/v1/logs/verify` | Official audit chain is intact after ERRU and ordinary events | läbis |
| 29 |  | GET /v1/logs/verify — Super Admin → 200 | `GET /ljvis/v1/logs/verify` | Verification checked actual events | läbis |
| 30 |  | GET /v1/logs/export?search=AUDITCI — Org Admin → 200, CSV scoped to own org | `GET /ljvis/v1/logs/export` | 200 | läbis |
| 31 |  | GET /v1/logs/export?search=AUDITCI — Org Admin → 200, CSV scoped to own org | `GET /ljvis/v1/logs/export` | CSV contains own-org marker | läbis |
| 32 |  | GET /v1/logs/export?search=AUDITCI — Org Admin → 200, CSV scoped to own org | `GET /ljvis/v1/logs/export` | CSV excludes other-org marker | läbis |
| 33 |  | GET /v1/logs/export?search=AUDITCI — Super Admin → 200, CSV has all orgs | `GET /ljvis/v1/logs/export` | 200 | läbis |
| 34 |  | GET /v1/logs/export?search=AUDITCI — Super Admin → 200, CSV has all orgs | `GET /ljvis/v1/logs/export` | CSV contains JUM marker | läbis |
| 35 |  | GET /v1/logs/export?search=AUDITCI — Super Admin → 200, CSV has all orgs | `GET /ljvis/v1/logs/export` | CSV contains PPA marker | läbis |

### 29. dashboard

**Ametniku töölaud** · testitüübid: funktsionaalne, regressioon · kollektsioon `tests/postman/collections/dashboard.collection.json`

| # | Rühm | Päring | Otspunkt | Kontroll | Tulemus |
|---|---|---|---|---|---|
| 1 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 2 |  | [Auth] Login — Super Admin | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 3 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 4 |  | [Auth] Login — No-perm User | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 5 |  | [Auth] Login — Officer (pc_officer) | `POST /ljvis/auth/dev/dev-login` | Login returns 200 | läbis |
| 6 |  | [Auth] Login — Officer (pc_officer) | `POST /ljvis/auth/dev/dev-login` | JWT token received | läbis |
| 7 |  | GET dashboard/summary — unauthenticated → 401 | `GET /ljvis/v1/dashboard/summary` | Unauthenticated 401 | läbis |
| 8 |  | GET dashboard/summary — admin, no data yet → 200 with all sections | `GET /ljvis/v1/dashboard/summary` | Returns 200 | läbis |
| 9 |  | GET dashboard/summary — admin, no data yet → 200 with all sections | `GET /ljvis/v1/dashboard/summary` | Default scope is own | läbis |
| 10 |  | GET dashboard/summary — admin, no data yet → 200 with all sections | `GET /ljvis/v1/dashboard/summary` | All 3 sections present as arrays | läbis |
| 11 |  | [Setup] Create compound form (draft, general proceeding, overdue deadline) | `POST /ljvis/v1/control-forms/compound-form/edit/save` | Returns 200 | läbis |
| 12 |  | [Setup] Create compound form (draft, general proceeding, overdue deadline) | `POST /ljvis/v1/control-forms/compound-form/edit/save` | id present | läbis |
| 13 |  | [Setup] Create sp-driver sub-form (proceedingType=general → deadline = controlDate+45d) | `POST /ljvis/v1/control-forms/drive-rest-form/driver/edit/save` | Returns 200 | läbis |
| 14 |  | [Setup] Create sp-driver sub-form (proceedingType=general → deadline = controlDate+45d) | `POST /ljvis/v1/control-forms/drive-rest-form/driver/edit/save` | id present | läbis |
| 15 |  | GET dashboard/summary — draft compound form appears with its sub-form | `GET /ljvis/v1/dashboard/summary` | Returns 200 | läbis |
| 16 |  | GET dashboard/summary — draft compound form appears with its sub-form | `GET /ljvis/v1/dashboard/summary` | Created compound form is in activeCompoundForms (status=saved) | läbis |
| 17 |  | GET dashboard/summary — draft compound form appears with its sub-form | `GET /ljvis/v1/dashboard/summary` | Sub-form appears nested with correct type/status | läbis |
| 18 |  | GET dashboard/summary — draft compound form appears with its sub-form | `GET /ljvis/v1/dashboard/summary` | Overdue general-proceeding deadline (controlDate+45d, in the past) surfaces in needsAttention | läbis |
| 19 |  | [Setup] Confirm compound form (status → confirmed, still unpublished) | `POST /ljvis/v1/control-forms/compound-form/edit/confirm` | Returns 200 | läbis |
| 20 |  | GET dashboard/summary — confirmed-but-unpublished compound form still active | `GET /ljvis/v1/dashboard/summary` | Returns 200 | läbis |
| 21 |  | GET dashboard/summary — confirmed-but-unpublished compound form still active | `GET /ljvis/v1/dashboard/summary` | Confirmed compound form remains in activeCompoundForms (sub-form not published) | läbis |
| 22 |  | [Setup] Create standalone labour-inspection act (draft) | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | Returns 200 | läbis |
| 23 |  | GET dashboard/summary — standalone draft act appears in activeStandaloneForms | `GET /ljvis/v1/dashboard/summary` | Returns 200 | läbis |
| 24 |  | GET dashboard/summary — standalone draft act appears in activeStandaloneForms | `GET /ljvis/v1/dashboard/summary` | Draft labour_inspection act is in activeStandaloneForms | läbis |
| 25 |  | GET dashboard/summary?scope=organisation — no-perm user silently falls back to own | `GET /ljvis/v1/dashboard/summary` | Returns 200 or 403 (no higher privilege leak) | läbis |
| 26 |  | GET dashboard/summary?scope=organisation — admin (control_form.view_unpublished) → organisation honoured | `GET /ljvis/v1/dashboard/summary` | Returns 200 | läbis |
| 27 |  | GET dashboard/summary?scope=organisation — admin (control_form.view_unpublished) → organisation honoured | `GET /ljvis/v1/dashboard/summary` | canSeeOrganisation true and scope honoured | läbis |
| 28 |  | GET scope=own — officer does not see admin's compound (own-isolation) | `GET /ljvis/v1/dashboard/summary` | Returns 200 | läbis |
| 29 |  | GET scope=own — officer does not see admin's compound (own-isolation) | `GET /ljvis/v1/dashboard/summary` | officer does not see admin compound in scope=own | läbis |
| 30 |  | GET scope=organisation — officer does NOT see admin's standalone (org-scope regression) | `GET /ljvis/v1/dashboard/summary` | Returns 200 | läbis |
| 31 |  | GET scope=organisation — officer does NOT see admin's standalone (org-scope regression) | `GET /ljvis/v1/dashboard/summary` | officer org-scope honoured (canSeeOrganisation=true) — else this regression test is a false-safe | läbis |
| 32 |  | GET scope=organisation — officer does NOT see admin's standalone (org-scope regression) | `GET /ljvis/v1/dashboard/summary` | admin standalone NOT visible to officer via org-scope (regression) | läbis |
| 33 |  | GET scope=garbage — falls back to own | `GET /ljvis/v1/dashboard/summary` | Returns 200 | läbis |
| 34 |  | GET scope=garbage — falls back to own | `GET /ljvis/v1/dashboard/summary` | scope falls back to own on invalid input | läbis |
| 35 |  | [Setup] Create TRAM control card | `POST /ljvis/v1/control-forms/tram-card/edit/save` | Returns 200 | läbis |
| 36 |  | [Setup] Create TRAM control card | `POST /ljvis/v1/control-forms/tram-card/edit/save` | TRAM card created | läbis |
| 37 |  | GET dashboard/summary — TRAM control card appears in activeStandaloneForms | `GET /ljvis/v1/dashboard/summary` | Returns 200 | läbis |
| 38 |  | GET dashboard/summary — TRAM control card appears in activeStandaloneForms | `GET /ljvis/v1/dashboard/summary` | TRAM card appears in activeStandaloneForms | läbis |
| 39 |  | GET dashboard/summary — TRAM control card appears in activeStandaloneForms | `GET /ljvis/v1/dashboard/summary` | TRAM card has tram- form number | läbis |
| 40 |  | [Setup] Create standalone LI for publish test | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | Returns 200 | läbis |
| 41 |  | [Setup] Create standalone LI for publish test | `POST /ljvis/v1/control-forms/labour-inspection/edit/save` | li_pub_id set | läbis |
| 42 |  | [Setup] Confirm standalone LI (li_pub_id) | `POST /ljvis/v1/control-forms/labour-inspection/edit/confirm` | Returns 200 | läbis |
| 43 |  | [Setup] Publish standalone LI (li_pub_id) | `POST /ljvis/v1/control-forms/labour-inspection/edit/publish` | Returns 200 | läbis |
| 44 |  | GET dashboard — published standalone gone from activeStandaloneForms | `GET /ljvis/v1/dashboard/summary` | Returns 200 | läbis |
| 45 |  | GET dashboard — published standalone gone from activeStandaloneForms | `GET /ljvis/v1/dashboard/summary` | published standalone absent from activeStandaloneForms | läbis |
| 46 |  | [Setup] Create compound 'upcoming deadline' (controlDate=today-43d, deadline=today+2d) | `POST /ljvis/v1/control-forms/compound-form/edit/save` | Returns 200 | läbis |
| 47 |  | [Setup] Create compound 'upcoming deadline' (controlDate=today-43d, deadline=today+2d) | `POST /ljvis/v1/control-forms/compound-form/edit/save` | upcoming_key set | läbis |
| 48 |  | [Setup] Create sub-form for upcoming compound (proceedingType=general) | `POST /ljvis/v1/control-forms/drive-rest-form/driver/edit/save` | Returns 200 | läbis |
| 49 |  | GET dashboard — upcoming in needsAttention with reason=upcoming + deadlineAt ≈ controlDate+45d | `GET /ljvis/v1/dashboard/summary` | Returns 200 | läbis |
| 50 |  | GET dashboard — upcoming in needsAttention with reason=upcoming + deadlineAt ≈ controlDate+45d | `GET /ljvis/v1/dashboard/summary` | upcoming compound in needsAttention | läbis |
| 51 |  | GET dashboard — upcoming in needsAttention with reason=upcoming + deadlineAt ≈ controlDate+45d | `GET /ljvis/v1/dashboard/summary` | reason is upcoming | läbis |
| 52 |  | GET dashboard — upcoming in needsAttention with reason=upcoming + deadlineAt ≈ controlDate+45d | `GET /ljvis/v1/dashboard/summary` | deadlineAt ≈ controlDate+45d (within 2d tolerance) | läbis |
| 53 |  | [Setup] Create compound 'far deadline' (controlDate=today-2d, deadline=today+43d) | `POST /ljvis/v1/control-forms/compound-form/edit/save` | Returns 200 | läbis |
| 54 |  | [Setup] Create compound 'far deadline' (controlDate=today-2d, deadline=today+43d) | `POST /ljvis/v1/control-forms/compound-form/edit/save` | far_key set | läbis |
| 55 |  | [Setup] Create sub-form for far compound (proceedingType=general) | `POST /ljvis/v1/control-forms/drive-rest-form/driver/edit/save` | Returns 200 | läbis |
| 56 |  | GET dashboard — far deadline (today+43d &gt; now+3d) NOT in needsAttention | `GET /ljvis/v1/dashboard/summary` | Returns 200 | läbis |
| 57 |  | GET dashboard — far deadline (today+43d &gt; now+3d) NOT in needsAttention | `GET /ljvis/v1/dashboard/summary` | far compound absent from needsAttention | läbis |
| 58 |  | [Setup] Create AC9 compound (far-future deadline, will be published) | `POST /ljvis/v1/control-forms/compound-form/edit/save` | Returns 200 | läbis |
| 59 |  | [Setup] Create AC9 compound (far-future deadline, will be published) | `POST /ljvis/v1/control-forms/compound-form/edit/save` | ac9_key set | läbis |
| 60 |  | [Setup] Create AC9 sub-form | `POST /ljvis/v1/control-forms/drive-rest-form/driver/edit/save` | Returns 200 | läbis |
| 61 |  | [Setup] Confirm AC9 sub-form | `POST /ljvis/v1/control-forms/drive-rest-form/driver/edit/confirm` | Returns 200 | läbis |
| 62 |  | [Setup] Publish AC9 sub-form | `POST /ljvis/v1/control-forms/drive-rest-form/driver/edit/publish` | Returns 200 | läbis |
| 63 |  | GET dashboard — AC9 compound still active (sub published, compound not yet) | `GET /ljvis/v1/dashboard/summary` | Returns 200 | läbis |
| 64 |  | GET dashboard — AC9 compound still active (sub published, compound not yet) | `GET /ljvis/v1/dashboard/summary` | AC9 compound still active (sub published, compound not) | läbis |
| 65 |  | [Setup] Confirm AC9 compound | `POST /ljvis/v1/control-forms/compound-form/edit/confirm` | Returns 200 | läbis |
| 66 |  | [Setup] Publish AC9 compound | `POST /ljvis/v1/control-forms/compound-form/edit/publish` | Returns 200 | läbis |
| 67 |  | GET dashboard — AC9 compound GONE (all sub-forms + compound published) [AC9 ✓] | `GET /ljvis/v1/dashboard/summary` | Returns 200 | läbis |
| 68 |  | GET dashboard — AC9 compound GONE (all sub-forms + compound published) [AC9 ✓] | `GET /ljvis/v1/dashboard/summary` | AC9 compound gone after all published | läbis |
| 69 |  | [Cleanup] Delete AC9 compound (published) | `POST /ljvis/v1/control-forms/compound-form/edit/delete` | Returns 200 | läbis |
| 70 |  | [Cleanup] Delete published standalone LI | `POST /ljvis/v1/control-forms/labour-inspection/edit/delete` | Returns 200 | läbis |
| 71 |  | [Cleanup] Delete upcoming compound | `POST /ljvis/v1/control-forms/compound-form/edit/delete` | Returns 200 | läbis |
| 72 |  | [Cleanup] Delete far compound | `POST /ljvis/v1/control-forms/compound-form/edit/delete` | Returns 200 | läbis |
| 73 |  | [Cleanup] Delete TRAM control card | `POST /ljvis/v1/control-forms/tram-card/edit/delete` | Returns 200 | läbis |
| 74 |  | [Cleanup] Delete standalone labour-inspection act | `POST /ljvis/v1/control-forms/labour-inspection/edit/delete` | Returns 200 | läbis |
| 75 |  | [Cleanup] Delete compound form | `POST /ljvis/v1/control-forms/compound-form/edit/delete` | Returns 200 | läbis |
| 76 |  | GET dashboard/summary — deleted compound form no longer active | `GET /ljvis/v1/dashboard/summary` | Returns 200 | läbis |
| 77 |  | GET dashboard/summary — deleted compound form no longer active | `GET /ljvis/v1/dashboard/summary` | Deleted compound form absent from activeCompoundForms | läbis |

## 4. Ruuteri DSL-stsenaariumid (`dsl-test`)

Ruuteri töövoogude loogika testid ilma andmebaasita (`DSL-tests/`, `DSL-tests-internal/`); väliste teenuste vastused on mockitud. Testitüübid: funktsionaalne, töökindlus, turve.

| # | Fail | Stsenaarium | Tulemus |
|---|---|---|---|
| 1 | `DSL-tests/auth/session.test.yml` | no cookie -&gt; 401 UNAUTHENTICATED | läbis |
| 2 | `DSL-tests/erru/nu-save.test.yml` | create persists preview | läbis |
| 3 | `DSL-tests/erru/nu-save.test.yml` | revision persists expected version | läbis |
| 4 | `DSL-tests/erru/nu-save.test.yml` | revision conflict is HTTP 409 | läbis |
| 5 | `DSL-tests/erru/nu-save.test.yml` | stale source preview is HTTP 409 | läbis |
| 6 | `DSL-tests/erru/nu-save.test.yml` | sent cannot be revised | läbis |
| 7 | `DSL-tests/erru/nu-send.test.yml` | concurrent revision rejects prepared send | läbis |
| 8 | `DSL-tests/erru/nu-send.test.yml` | changed source rejects prepared send | läbis |
| 9 | `DSL-tests/erru/nu-send.test.yml` | HTTP failure is persisted | läbis |
| 10 | `DSL-tests/erru/nu-send.test.yml` | valid ACK persists success | läbis |
| 11 | `DSL-tests/erru/nu-send.test.yml` | stale browser version rejected before NYSIIS | läbis |
| 12 | `DSL-tests/erru/nu-send.test.yml` | missing version returns validation error | läbis |
| 13 | `DSL-tests/erru/nu-transport.test.yml` | connection refused persists terminal failure | läbis |
| 14 | `DSL-tests/erru/rsi-build.test.yml` | build sends odometer reading as a string and maps checked items to RSI_FAILED_REASON items | läbis |
| 15 | `DSL-tests/erru/rsi-build.test.yml` | build leaves identificationDetails empty when the compound form's company block is only partially filled | läbis |
| 16 | `DSL-tests/erru/rsi-send.test.yml` | send converts RSI_FAILED_REASON items to rsiCheckedItemType | läbis |
| 17 | `DSL-tests/erru/rsi-send.test.yml` | send rejects legacy TECHNICAL_CHECK codes and failed items without a reason | läbis |
| 18 | `DSL-tests/framework/routing.test.yml` | unknown project -&gt; 404 | läbis |
| 19 | `DSL-tests/framework/routing.test.yml` | unknown path in ljvis -&gt; 404 | läbis |
| 20 | `DSL-tests/framework/routing.test.yml` | wrong method on a known path -&gt; 405 | läbis |
| 21 | `DSL-tests/notification/template-mapping-resolve-users.test.yml` | resolves comma-separated personal codes to users | läbis |
| 22 | `DSL-tests/notification/template-mapping-resolve-users.test.yml` | missing permission is forbidden | läbis |
| 23 | `DSL-tests/notification/template-mapping-save.test.yml` | postkast template alias is accepted as templateId | läbis |
| 24 | `DSL-tests/notification/template-mapping-save.test.yml` | template alias containing spaces is rejected before insert | läbis |
| 25 | `DSL-tests/notification/template-mapping-save.test.yml` | desktop channel with recipients is saved as comma-joined personal_code list | läbis |
| 26 | `DSL-tests/notification/template-mapping-save.test.yml` | invalid channel is rejected before insert | läbis |
| 27 | `DSL-tests-internal/notification/create.test.yml` | desktop mapping with recipients is stamped onto the notification | läbis |
| 28 | `DSL-tests-internal/notification/create.test.yml` | type without desktop mapping is stamped with no recipients | läbis |
| 29 | `DSL-tests-internal/notification/create.test.yml` | missing required_permission is rejected before any lookup | läbis |
| 30 | `DSL-tests-internal/notification/create.test.yml` | duplicate event returns success and still signals clients | läbis |
| 31 | `DSL-tests-internal/notification/create.test.yml` | failed persistence returns 502 without websocket push | läbis |
| 32 | `DSL-tests-internal/notification/create.test.yml` | websocket failure does not undo a saved notification | läbis |
| 33 | `DSL-tests-internal/notification/evaluate-technical-publish.test.yml` | foreign EU vehicle creates all applicable technical notifications | läbis |
| 34 | `DSL-tests-internal/notification/evaluate-technical-publish.test.yml` | Estonian compliant vehicle creates no notification | läbis |
| 35 | `DSL-tests-internal/xroad/aj.test.yml` | findUsage returns unwrapped protocol response, optional fields omitted | läbis |
| 36 | `DSL-tests-internal/xroad/aj.test.yml` | findUsage strips lowercase ee prefix and allows representation (userId differs) | läbis |
| 37 | `DSL-tests-internal/xroad/aj.test.yml` | findUsage bare code, large limit is not capped, timezone offset accepted | läbis |
| 38 | `DSL-tests-internal/xroad/aj.test.yml` | findUsage page past the end keeps totalUsages | läbis |
| 39 | `DSL-tests-internal/xroad/aj.test.yml` | findUsage missing X-Road-UserId -&gt; 400 | läbis |
| 40 | `DSL-tests-internal/xroad/aj.test.yml` | findUsage missing userCode -&gt; 400 | läbis |
| 41 | `DSL-tests-internal/xroad/aj.test.yml` | findUsage bare EE prefix only -&gt; 400 | läbis |
| 42 | `DSL-tests-internal/xroad/aj.test.yml` | findUsage non-numeric offset -&gt; 400 | läbis |
| 43 | `DSL-tests-internal/xroad/aj.test.yml` | findUsage negative offset -&gt; 400 | läbis |
| 44 | `DSL-tests-internal/xroad/aj.test.yml` | findUsage zero limit -&gt; 400 | läbis |
| 45 | `DSL-tests-internal/xroad/aj.test.yml` | findUsage date without time -&gt; 400 | läbis |
| 46 | `DSL-tests-internal/xroad/aj.test.yml` | findUsage impossible date -&gt; 400 | läbis |
| 47 | `DSL-tests-internal/xroad/aj.test.yml` | findUsage Resql failure -&gt; 500 | läbis |
| 48 | `DSL-tests-internal/xroad/aj.test.yml` | usagePeriod returns unwrapped periodStart | läbis |
| 49 | `DSL-tests-internal/xroad/aj.test.yml` | usagePeriod Resql failure -&gt; 500 | läbis |
| 50 | `DSL-tests-internal/xroad/aj.test.yml` | heartbeat OK when database answers | läbis |
| 51 | `DSL-tests-internal/xroad/aj.test.yml` | heartbeat FAIL when database does not answer | läbis |
| 52 | `DSL-tests-internal/xroad/aj.test.yml` | findUsage OpenAPI description is served | läbis |

## 5. X-tee arendaja-mocki testid

`DSL-mock-tests/xtee.test.yml` — avaliku arendaja-mocki leping ja käitumine (vt [X-tee testprotokoll](../xtee/08-testprotokoll.md)).

| # | Stsenaarium | Tulemus |
|---|---|---|
| 1 | IsikuKontroll success | läbis |
| 2 | IsikuKontroll missing client | läbis |
| 3 | IsikuKontroll malformed client | läbis |
| 4 | IsikuKontroll denied client | läbis |
| 5 | IsikuKontroll missing body | läbis |
| 6 | IsikuKontroll server error | läbis |
| 7 | IsikuEttevoteKontrollid success | läbis |
| 8 | IsikuEttevoteKontrollid missing client | läbis |
| 9 | IsikuEttevoteKontrollid malformed client | läbis |
| 10 | IsikuEttevoteKontrollid denied client | läbis |
| 11 | IsikuEttevoteKontrollid missing body | läbis |
| 12 | IsikuEttevoteKontrollid server error | läbis |
| 13 | ErakorralineYVquery success | läbis |
| 14 | ErakorralineYVquery missing client | läbis |
| 15 | ErakorralineYVquery malformed client | läbis |
| 16 | ErakorralineYVquery denied client | läbis |
| 17 | ErakorralineYVquery missing body | läbis |
| 18 | ErakorralineYVquery server error | läbis |
| 19 | ErakorralineYVconfirm success | läbis |
| 20 | ErakorralineYVconfirm missing client | läbis |
| 21 | ErakorralineYVconfirm malformed client | läbis |
| 22 | ErakorralineYVconfirm denied client | läbis |
| 23 | ErakorralineYVconfirm missing body | läbis |
| 24 | ErakorralineYVconfirm server error | läbis |
| 25 | RegisterJobInspection success | läbis |
| 26 | RegisterJobInspection missing client | läbis |
| 27 | RegisterJobInspection malformed client | läbis |
| 28 | RegisterJobInspection denied client | läbis |
| 29 | RegisterJobInspection missing body | läbis |
| 30 | RegisterJobInspection server error | läbis |
| 31 | RegisterJobInspection_v3 success | läbis |
| 32 | RegisterJobInspection_v3 missing client | läbis |
| 33 | RegisterJobInspection_v3 malformed client | läbis |
| 34 | RegisterJobInspection_v3 denied client | läbis |
| 35 | RegisterJobInspection_v3 missing body | läbis |
| 36 | RegisterJobInspection_v3 server error | läbis |
| 37 | findUsage success | läbis |
| 38 | findUsage server error | läbis |
| 39 | usagePeriod success | läbis |
| 40 | usagePeriod server error | läbis |
| 41 | heartbeat success | läbis |
| 42 | health is public without session and X-Road headers | läbis |
| 43 | isiku-kontroll unknown valid person is empty | läbis |
| 44 | isiku-kontroll invalid person | läbis |
| 45 | isiku-ettevote-kontrollid unknown valid person is empty | läbis |
| 46 | isiku-ettevote-kontrollid invalid person | läbis |
| 47 | date order | läbis |
| 48 | date filter empty | läbis |
| 49 | confirmation unknown identifier | läbis |
| 50 | confirmation invalid enum | läbis |
| 51 | confirmation repeated request is deterministic | läbis |
| 52 | v3 optional fields absent | läbis |
| 53 | v3 invalid optional person | läbis |
| 54 | v3 invalid optional enum | läbis |
| 55 | job repeated request | läbis |
| 56 | AJ missing userid | läbis |
| 57 | AJ missing userCode | läbis |
| 58 | AJ representation: userid differs from userCode | läbis |
| 59 | AJ EE prefix is stripped from userCode | läbis |
| 60 | AJ invalid offset | läbis |
| 61 | AJ invalid periodStart | läbis |
| 62 | AJ deterministic page 0 | läbis |
| 63 | AJ deterministic page 1 | läbis |
| 64 | AJ deterministic page 2 | läbis |
| 65 | AJ deterministic page 3 | läbis |
| 66 | AJ unknown person | läbis |
| 67 | AJ date filtering | läbis |
| 68 | usage period empty log still reports periodStart | läbis |
| 69 | heartbeat database failure | läbis |

## 6. Lepingu- ja andmebaasitestid

| Test | Tulemus (logi viimane rida) |
|---|---|
| `contract` | OK |
| `contract-check` | OK — 29 NU contract checks |

