# LJVIS-2 — Functional Tests

Newman/Postman E2E tests for the full LJVIS-2 API stack.

---

## Quick start

### Prerequisites

```bash
npm install -g newman
```

---

## Running clean tests locally

`docker-compose.ci.yml` is an isolated clean-state stack — works identically
locally and on CI. The only difference is the **project name**, which keeps
volumes and networks separate from any other running stack.

```bash
# 1. Start a clean local test stack (separate from your dev docker-compose.yml)
docker compose -f docker-compose.ci.yml -p ljvis-local up -d --build

# 2. For Mac system use: wait ~60-90 s for all services to become healthy, then run all collections
tests/postman/run-all.sh tests/postman/ci-stack-environment.json
# 2.1 For Windows system use:
tests\postman\run-all.bat

# 3. Tear down and delete all volumes when done
docker compose -f docker-compose.ci.yml -p ljvis-local down -v
```

This stack runs on ports **9086** (Ruuter), **9087** (resql-ljvis), **9085** (TIM)
and is completely isolated from `docker-compose.yml` (ports 808x).

### Run a single collection

```bash
newman run tests/postman/collections/users.collection.json \
  -e tests/postman/ci-stack-environment.json
```

### Clean up test user between runs

The `POST /users/insert` test creates personal code `51001011234`. If you rerun
without tearing down volumes, delete it first:

```bash
PGPASSWORD=01234 psql -h localhost -p 5433 -U ljvis -d ljvis_db -c "
  DELETE FROM users.user_account WHERE personal_code = '51001011234';
"
```

---

## How local vs CI differ

| | Local | CI (GitHub Actions) |
|---|---|---|
| Compose file | `docker-compose.ci.yml` | `docker-compose.ci.yml` |
| Project name | `-p ljvis-local` | `-p ljvis-ci` |
| Named volumes | `ljvis-local_ci-db-data` … | `ljvis-ci_ci-db-data` … |
| Env file | `ci-stack-environment.json` | `ci-stack-environment.json` |

They are identical in every other way.

---

## Running against the existing DEV stack

Use only when `docker-compose.yml` is already running and you want a quick
sanity check (not a clean state — not repeatable without manual cleanup).

```bash
tests/postman/run-all.sh tests/postman/dev-stack-environment.json
```

---

## Infrastructure

One database (`ljvis_db`), one RESQL service (`resql-ljvis`). All application
tables live in the `users`, `classifier`, and `audit` schemas. Liquibase manages the schema; the bootstrap
service seeds minimal test data after migrations.

| Constant | Value |
|---|---|
| `LJVIS_RESQL` | `http://resql-ljvis:8090/ljvis` |
| `LJVIS_USERS_RESQL` | (removed — merged into `LJVIS_RESQL`) |

---

## Environment files

| File | When to use | Ruuter port |
|---|---|---|
| `ci-stack-environment.json` | Local clean runs + CI | 9086 |
| `dev-stack-environment.json` | Against already-running `docker-compose.yml` | 8086 |

---

## Collection structure

Tests are split into **feature collections** under `tests/postman/collections/`.
Each collection is **self-contained** — it authenticates itself and resolves IDs
via API, with no shared state between collections.

```
tests/postman/
├── collections/
│   ├── classifiers.collection.json
│   ├── erru-ctud.collection.json
│   ├── labour-inspection.collection.json
│   ├── organisations.collection.json
│   ├── permissions.collection.json
│   ├── users.collection.json
│   └── user-groups.collection.json
├── ci-stack-environment.json
├── dev-stack-environment.json
└── run-all.sh
```

`run-all.sh` (Linux/Mac) or `run-all.bat` (Windows) run them in order. To add a new feature, create a new
`<feature>.collection.json` in `collections/` and add it to `run-all.sh` (Linux/Mac) and `run-all.bat` (Windows).

| Collection | What it covers |
|---|---|
| **classifiers** | List (search/pagination), get (403/success), get-values (403/success with status), edit/update (403/422/200), values/insert (403/200), values/update (403/200) |
| **erru-ctud** | Create draft (403 without `ctud.create`, 422 validation matrix: min-two-of-three search criteria / `unknown` name / missing registration country / missing or 1-char target country / missing source+purpose / max length, 200 create with `version=1` and generated `CTUD-EE-AAAA-NNNNN`), get (403/404/200 with upper-cased text and `ctudFrom=EE`), revise (200 `version=2` with unchanged `businessCaseId`, 422 missing id, 422 `not_editable` once sent), list (403, `{content,total}`, one row per request not per snapshot, `direction` filter, OR-group name-or-licence), send (403 without `ctud.send` **and no snapshot written**, DE→`Found` with 2 licences + true copy + vehicle list, LV→`NotFound`, PL→`Timeout`, GR→`NotAvailable` — both still `responded`, not `error` — FI→transport failure `error`, retry-from-error allowed, 422 `not_sendable` on re-send, 404), inbound machine endpoint on `ruuter-internal` (Found + `Grey` risk, replay of the same `technicalId` returns the same answer and creates **no** duplicate, NotFound, `requestAllVehicles=false`, 400 `InvalidData` for each missing ERRU envelope field, 400 for fewer than two criteria and for `unknown`) |
| **labour-inspection** | Create/edit/save (403, 422 required/future-date/max-length, 200 create+version=1), get (403/404/200), re-save (200, version increments), confirm (403, 200, already_confirmed 422, violations-present 422), edit-after-confirm (422 form_locked_after_confirm), delete (403/200, deleted still readable) |
| **organisations** | `GET /organisations/list` — verify 3 seeded orgs (CBO, JUM, PPA) |
| **permissions** | `GET /permissions/list` — verify seeded permissions, check `user_group.update` present |
| **users** | List (admin/403), check-exists, insert (success/409/422/403), get, update, set-groups, get-groups |
| **user-groups** | List (admin/403), get, get-organisations/permissions/users, insert (success/422/403), get-available-users, update-name, set-organisations, set-permissions, add-users, delete-user |

### What each collection sets up internally

| Collection | Auth roles used | Setup queries |
|---|---|---|
| classifiers | Super Admin, No-perm (403 tests) | classifier ID |
| erru-ctud | Super Admin (`ctud.read`+`create`+`send`), Org Admin (`ctud.read`+`create`, **no** `ctud.send`), No-perm (403 tests) | none — creates its own requests; needs `internal_api_url` for the inbound endpoint |
| labour-inspection | Super Admin, No-perm (403 tests) | none — creates its own acts |
| organisations | Super Admin | — |
| permissions | Super Admin | — |
| users | Super Admin, No-perm (403 tests) | org ID, group ID |
| user-groups | Super Admin, No-perm (403 tests) | org ID, permission ID, group ID, seeded user ID |

---

## Seeded test data (tests/bootstrap/seed_test_data.sql)

Seed runs once after Liquibase migrations. It is idempotent (`WHERE NOT EXISTS`).

### Users

| Role | Personal code | Organisation | Group |
|---|---|---|---|
| Super Admin | `38001085718` | Politsei- ja Piirivalveamet (PPA) | Super Admin Group |

### Organisations

| Name | Code |
|---|---|
| CI Bootstrap Organisation | CBO |
| Justiitsministeerium | JUM |
| Politsei- ja Piirivalveamet | PPA |

### Groups (seeded by Liquibase)

| Group | Key permissions |
|---|---|
| Super Admin Group | `user.list.admin`, `user.read.admin`, `user.edit.admin`, `user_group.list.admin`, `user_group.update`, `organisation.list`, `permission.list`, `classifier.list`, `classifier.read`, `classifier.edit`, `classifier_value.edit`, `labour_inspection_form.write`, `labour_inspection_form.read`, `control_form.view_unpublished`, `control_form.delete` |
| Local Admin Group | `user.list.local`, `user.read.local`, `user.edit.local`, `user_group.list.local`, `user_group.update`, `classifier.list`, `classifier.read`, `classifier.edit`, `classifier_value.edit` |

### Classifiers

| Code | Name | Values |
|---|---|---|
| RTK | Riikide ja territooriumide klassifikaator | EE (Eesti), LV (Läti), LT (Leedu) |
| TEST | Test Classifier | — |

### Test-created data (cleaned up by `down -v`)

| What | Personal code / name |
|---|---|
| Inserted user (users collection) | `51001011234` |
| Inserted group (user-groups collection) | `Test Group CI` |
| Inserted classifier value (classifiers collection) | `TEST_CI` (code) |

---

## Adding new tests

1. Create `tests/postman/collections/<feature>.collection.json`.
2. Start with `[Auth]` login requests and `[Setup]` queries to resolve IDs.
3. Add the collection to `tests/postman/run-all.sh` **and** `run-all.bat`.
4. If the feature has an endpoint on `ruuter-internal`, target it with `{{internal_api_url}}`
   (CI `http://localhost:9089`, dev `http://localhost:8089`) rather than `{{api_url}}`.

See `.skills/generate-functional-tests/SKILL.md` for the full guide on
conventions, test case taxonomy, and JSON structure reference.

---

## Notes on the local-admin scenario (users collection)

The users collection includes an end-to-end scenario that tests org-scoped access:

1. Admin creates user `48001011236` in JUM → assigns to **Local Admin Group**
2. Local admin logs in → `GET /users/list` returns only JUM users (scope enforced by `user.list.local`)
3. Local admin inserts user `48001021232` in JUM
4. Local admin calls list again → new user is visible, count grew by 1

These users are created during the test run and cleaned up by `down -v`.
To clean manually (between runs without full teardown):

```bash
PGPASSWORD=01234 psql -h localhost -p 5433 -U ljvis -d ljvis_db -c "
  DELETE FROM users.user_account WHERE personal_code = ANY(ARRAY['48001011236','48001021232']);
"
```
