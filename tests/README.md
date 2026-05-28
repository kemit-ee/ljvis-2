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

# 2. Wait ~60-90 s for all services to become healthy, then run all collections
tests/postman/run-all.sh tests/postman/ci-stack-environment.json

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
  DELETE FROM ljvis2.user_account_latest WHERE user_account_id IN (SELECT id FROM ljvis2.user_account WHERE personal_code = '51001011234');
  DELETE FROM ljvis2.user_account_user_group_state WHERE user_account_user_group_id IN (SELECT uaug.id FROM ljvis2.user_account_user_group uaug JOIN ljvis2.user_account ua ON ua.id = uaug.user_account_id WHERE ua.personal_code = '51001011234');
  DELETE FROM ljvis2.user_account_user_group WHERE user_account_id IN (SELECT id FROM ljvis2.user_account WHERE personal_code = '51001011234');
  DELETE FROM ljvis2.user_account_state WHERE user_account_id IN (SELECT id FROM ljvis2.user_account WHERE personal_code = '51001011234');
  DELETE FROM ljvis2.user_account_data_state WHERE user_account_id IN (SELECT id FROM ljvis2.user_account WHERE personal_code = '51001011234');
  DELETE FROM ljvis2.user_account WHERE personal_code = '51001011234';
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
tables live in the `ljvis2` schema. Liquibase manages the schema; the bootstrap
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
│   ├── organisations.collection.json
│   ├── permissions.collection.json
│   ├── users.collection.json
│   └── user-groups.collection.json
├── ci-stack-environment.json
├── dev-stack-environment.json
└── run-all.sh
```

`run-all.sh` runs them in order. To add a new feature, create a new
`<feature>.collection.json` in `collections/` and add it to `run-all.sh`.

| Collection | What it covers |
|---|---|
| **organisations** | `GET /organisations/list` — verify 3 seeded orgs (CBO, JUM, PPA) |
| **permissions** | `GET /permissions/list` — verify seeded permissions, check `user_group.update` present |
| **users** | List (admin/403), check-exists, insert (success/409/422/403), get, update, set-groups, get-groups |
| **user-groups** | List (admin/403), get, get-organisations/permissions/users, insert (success/422/403), get-available-users, update-name, set-organisations, set-permissions, add-users, delete-user |

### What each collection sets up internally

| Collection | Auth roles used | Setup queries |
|---|---|---|
| organisations | Super Admin | — |
| permissions | Super Admin | — |
| users | Super Admin, No-perm (403 tests) | org ID, group ID |
| user-groups | Super Admin, No-perm (403 tests) | org ID, permission ID, group ID, seeded user ID |

---

## Seeded test data (tests/bootstrap/seed_admin_and_organizations.sql)

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
| Super Admin Group | `user.list.admin`, `user.read.admin`, `user.edit.admin`, `user_group.list.admin`, `user_group.update`, `organisation.list`, `permission.list` |
| Local Admin Group | `user.list.local`, `user.read.local`, `user.edit.local`, `user_group.list.local`, `user_group.update` |

### Test-created data (cleaned up by `down -v`)

| What | Personal code / name |
|---|---|
| Inserted user (users collection) | `51001011234` |
| Inserted group (user-groups collection) | `Test Group CI` |

---

## Adding new tests

1. Create `tests/postman/collections/<feature>.collection.json`.
2. Start with `[Auth]` login requests and `[Setup]` queries to resolve IDs.
3. Add the collection to `tests/postman/run-all.sh`.

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
  DO \$\$ DECLARE pc TEXT;
  BEGIN FOR pc IN SELECT unnest(ARRAY['48001011236','48001021232']) LOOP
    DELETE FROM ljvis2.user_account_latest WHERE user_account_id IN (SELECT id FROM ljvis2.user_account WHERE personal_code = pc);
    DELETE FROM ljvis2.user_account_user_group_state WHERE user_account_user_group_id IN (SELECT uaug.id FROM ljvis2.user_account_user_group uaug JOIN ljvis2.user_account ua ON ua.id = uaug.user_account_id WHERE ua.personal_code = pc);
    DELETE FROM ljvis2.user_account_user_group WHERE user_account_id IN (SELECT id FROM ljvis2.user_account WHERE personal_code = pc);
    DELETE FROM ljvis2.user_account_state WHERE user_account_id IN (SELECT id FROM ljvis2.user_account WHERE personal_code = pc);
    DELETE FROM ljvis2.user_account_data_state WHERE user_account_id IN (SELECT id FROM ljvis2.user_account WHERE personal_code = pc);
    DELETE FROM ljvis2.user_account WHERE personal_code = pc;
  END LOOP; END \$\$;
"
```
