---
name: generate-functional-tests
description: |
  Generate or expand Newman/Postman functional test cases for implemented LJVIS-2 endpoints.
  Use when the user says 'loo funktsionaaltestid', 'lisa testid', 'generate functional tests',
  'write e2e tests for issue', 'cover this endpoint with tests', or asks to add test coverage
  for an implemented GitHub issue or DSL endpoint.
  Expects: GitHub issue number(s) or endpoint names; reads DSL from Ruuter YML files.
---

# Generate Functional Tests

Produces or expands the following artifacts:

```
tests/
  postman/
    ljvis-e2e-collection.json       ← expand: add new folder(s) with test requests
    ci-stack-environment.json       ← update only: add missing variables
    dev-stack-environment.json      ← create if missing or update variables
  README.md                         ← create if missing or update run instructions
```

**One collection, organized by folders.** Each domain area (Users, User Groups, etc.) is a
top-level folder inside `ljvis-e2e-collection.json`. Tests within a folder run sequentially
and share state via `pm.environment.set` / `pm.environment.get`.

---

## Rules (non-negotiable)

| Rule | Detail |
|------|--------|
| **One collection file** | All tests live in `tests/postman/ljvis-e2e-collection.json`. Never create separate collection files per area. |
| **Sequential execution** | Tests in a folder run top-to-bottom. Later tests may depend on IDs saved by earlier tests. |
| **Save created IDs** | After every create operation, save the new entity ID with `pm.environment.set('created_<entity>_id', ...)`. |
| **Assert structure, not just status** | Every test must verify at least: HTTP status code AND a key field in the response body. |
| **Test all permission boundaries** | Every protected endpoint needs a 403 test using `cookie_noperm`. |
| **Test validation errors** | Every create/update endpoint needs a 422/400 test with missing or invalid fields. |
| **Test conflict cases** | Create endpoints with unique constraints need a 409 test (duplicate personal code, etc.). |
| **Test scope enforcement** | Endpoints with `user.*.local` permissions need a test that confirms local admin cannot see/edit other orgs. |
| **RESQL returns lowercase** | All field names from the API are lowercase (e.g. `firstname`, `organisationid`, not camelCase). Assertions must use the actual lowercase field names. |
| **Permissions are a comma-separated string** | The `permissions` field is `"perm_user_list_admin,perm_user_edit_admin,..."` — use `.indexOf('perm_...')`. |
| **Auth via dev-login** | Never use real TARA/TIM OAuth flow in tests. Use `POST /ljvis/auth/dev/dev-login` with `{"personalCode": "..."}` to get a cookie. |
| **Cookie storage** | Store auth cookie as `customJwtCookie=<token>` in environment variable (e.g. `cookie_admin`, `cookie_local`, `cookie_noperm`). |
| **Cleanup via sequential test design** | Tests should not leave orphan data. Create → verify → use ID in further tests within the same folder run. |
| **No hardcoded port numbers in tests** | Use `{{api_url}}` from environment. Never put `localhost:8086` or `localhost:9086` directly in requests. |

---

## When to Use

- When a GitHub issue has Ruuter DSL files implemented (check `DSL/Ruuter/ljvis/GET/` and `DSL/Ruuter/ljvis/POST/`)
- When adding test coverage for a new endpoint
- When expanding test coverage for an already-tested area
- When a new feature branch merges to `dev` and needs CI coverage

## When Not to Use

- For frontend/UI testing → that requires a separate Playwright/Cypress skill
- For unit-testing individual SQL queries → test via direct psql or a DB test
- For endpoints on feature branches not yet merged → wait for merge to `dev`

---

## Required Context

The skill reads automatically:
- `DSL/Ruuter/ljvis/GET/<area>/*.yml` — endpoint definition, required permissions, query params
- `DSL/Ruuter/ljvis/POST/<area>/*.yml` — endpoint definition, required body fields, validation steps
- `tests/bootstrap/seed_test_data.sql` — what test data is available
- `tests/postman/ci-stack-environment.json` — existing environment variables
- `tests/postman/ljvis-e2e-collection.json` — existing test structure (avoid duplicating)

The user **must** confirm:
- Which GitHub issues / endpoints to cover (e.g., "issue #3 and #4")
- Whether the stack is already running locally (for sanity-check after writing)

---

## Seeded Test Users (from `seed_test_data.sql`)

| Personal code | Role | Cookie variable | Groups |
|---|---|---|---|
| `38001085718` | Super Admin | `cookie_admin` | CI Super Admin Group (`perm_%_admin`) |

Seeded organisations: `CI Bootstrap Organisation`, `Justiitsministeerium`, `Politsei- ja Piirivalveamet`

---

## Authentication Pattern

Every test area must begin with a login step (or rely on the `Authentication` folder running first in the collection). Login saves the cookie for reuse.

```json
{
  "name": "Login — Super Admin",
  "request": {
    "method": "POST",
    "url": "{{api_url}}/ljvis/auth/dev/dev-login",
    "body": { "mode": "raw", "raw": "{\"personalCode\": \"{{pc_admin}}\"}" }
  },
  "event": [{
    "listen": "test",
    "script": { "exec": [
      "pm.test('Login returns 200', () => pm.response.to.have.status(200));",
      "const body = pm.response.json();",
      "const token = typeof body === 'string' ? body : (body.response || body.token || '');",
      "pm.test('JWT token received', () => pm.expect(token).to.not.be.empty);",
      "pm.environment.set('cookie_admin', 'customJwtCookie=' + token);"
    ]}
  }]
}
```

---

## Process

### Step 1: Identify Covered Endpoints

1. Read the specified GitHub issue(s).
2. Find the corresponding Ruuter YML files in `DSL/Ruuter/ljvis/GET/` and `DSL/Ruuter/ljvis/POST/`.
3. For each YML file, extract:
   - HTTP method + path
   - Required permission(s) from `check_permission` step
   - Input fields (query params or body fields from `allowlist`)
   - Validation steps (required fields, length checks, format checks)
   - Conflict/error paths (409, 422, 403, 404)
4. List all test cases to create (see Test Case Taxonomy below).

### Step 2: Check Existing Collection

1. Read `tests/postman/ljvis-e2e-collection.json`.
2. Identify if a folder for this area already exists.
   - If **yes**: append new test items inside that folder.
   - If **no**: create a new top-level folder.
3. Never delete or rename existing test items.

### Step 3: Write Test Items

For each endpoint, generate test items following the Test Case Taxonomy.
Follow the JSON structure from `tests/postman/ljvis-e2e-collection.json` exactly.
Use `pm.environment.set` to persist IDs for later reuse within the same run.

### Step 4: Update Environment Files

1. Open `tests/postman/ci-stack-environment.json`.
2. Add any new variables that tests depend on (e.g. `created_user_id`, `created_group_id`).
3. Mirror the same variable names (with empty values) in `tests/postman/dev-stack-environment.json`.

### Step 5: Verify Sanity

Run the following sanity check to confirm all `{{variable}}` references in the collection have a matching key in the environment:

```bash
node -e "
const col = require('./tests/postman/ljvis-e2e-collection.json');
const env = require('./tests/postman/ci-stack-environment.json');
const keys = new Set(env.values.map(v => v.key));
const missing = new Set();
JSON.stringify(col).replace(/\{\{(\w+)\}\}/g, (_, k) => missing.add(k));
const gaps = [...missing].filter(k => !keys.has(k));
if (gaps.length) { console.error('Missing env vars:', gaps); process.exit(1); }
console.log('OK — all variables resolved');
"
```

If `MISSING:` lines appear, add the variable to both environment files before finishing.

### Step 6: Update tests/README.md

Append a row to the "Test folders" table in `tests/README.md` for each new folder added.

---

## Test Case Taxonomy

For every endpoint, create test cases in this order:

### List / GET endpoints
1. **Happy path — admin** → 200, array response, verify at least one known item
2. **Happy path — local admin scope** (if `*.local` permission exists) → 200, only own org items returned
3. **No permission → 403** → use `cookie_noperm`

### Get-by-ID endpoints
1. **Happy path — admin** → 200, correct entity returned, verify key fields
2. **Scope restriction — local admin other org → 403** (if applicable)
3. **Not found → 404 or empty** (use a random/nonexistent UUID)

### Create (POST insert) endpoints
1. **Happy path** → 200, `id` field present, save ID with `pm.environment.set`
2. **Duplicate / conflict → 409** (if unique constraint exists)
3. **Missing required field → 422** (omit one mandatory field)
4. **No permission → 403** → use `cookie_noperm`

### Update endpoints
1. **Happy path** → 200, changed field reflected in response or subsequent GET
2. **No permission → 403** → use `cookie_noperm`

### Add/Remove member endpoints
1. **Add → 200**, then verify member appears in get-users/get-groups
2. **Remove → 200**, then verify member is gone

---

## Running the Tests

### CI stack (isolated, always fresh)

```bash
# Start (takes ~3 min first time)
docker compose -f docker-compose.ci.yml -p ljvis-ci up -d --build

# Wait for health (ruuter on 9086, tim on 9085)
until curl -sf http://localhost:9086/actuator/health; do sleep 5; done
until curl -sf http://localhost:9085/actuator/health; do sleep 5; done

# Run all tests
newman run tests/postman/ljvis-e2e-collection.json \
  -e tests/postman/ci-stack-environment.json \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export newman-report.html \
  --bail

# Tear down
docker compose -f docker-compose.ci.yml -p ljvis-ci down -v
```

### DEV stack (already running via docker-compose.yml)

```bash
newman run tests/postman/ljvis-e2e-collection.json \
  -e tests/postman/dev-stack-environment.json \
  --reporters cli
```

### Single folder only

```bash
newman run tests/postman/ljvis-e2e-collection.json \
  -e tests/postman/dev-stack-environment.json \
  --folder "Users"
```

### Install Newman (one-time)

```bash
npm install -g newman newman-reporter-htmlextra
```

---

## Collection JSON Structure Reference

```json
{
  "info": {
    "name": "LJVIS — E2E Functional Tests",
    "_postman_id": "ljvis-e2e-v2",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "<Folder name>",
      "item": [
        {
          "name": "<Test name>",
          "request": {
            "method": "GET|POST",
            "header": [{ "key": "Cookie", "value": "{{cookie_admin}}" }],
            "url": {
              "raw": "{{api_url}}/ljvis/<path>",
              "host": ["{{api_url}}"],
              "path": ["ljvis", "<path segments>"]
            },
            "body": {
              "mode": "raw",
              "raw": "{\"field\": \"value\"}"
            }
          },
          "event": [{
            "listen": "test",
            "script": {
              "exec": [
                "pm.test('Returns 200', () => pm.response.to.have.status(200));",
                "const body = pm.response.json();",
                "pm.test('id present', () => pm.expect(body).to.have.property('id'));"
              ]
            }
          }]
        }
      ]
    }
  ],
  "variable": []
}
```

**Notes on JSON structure:**
- `url.host` must be `["{{api_url}}"]` (array with one element, no trailing slash)
- `url.path` must be an array of path segments (no leading slash, no `{{api_url}}`)
- `body` is omitted entirely for GET requests (do not include `body: {}`)
- `header` for authenticated requests: `[{ "key": "Cookie", "value": "{{cookie_admin}}" }]`
- `header` for POST with JSON body: add `{ "key": "Content-Type", "value": "application/json" }`

---

## Important Reminders

> **Every time new test items are added:**
> 1. Verify environment variables exist in both `ci-stack-environment.json` and `dev-stack-environment.json`
> 2. Run the sanity check (Step 5) to catch missing `{{variable}}` references
> 3. Ensure the Authentication folder runs before other folders (it saves cookies)
> 4. Add the new folder name to the "Test folders" table in `tests/README.md`
> 5. After a successful test run on CI stack, update the related GitHub issue with a comment confirming test coverage
> 6. RESQL field names are always **lowercase** — assertions must match (e.g. `body.firstname`, not `body.firstName`)
> 7. When testing scope (local admin), verify both the positive case (own org) AND the negative case (other org → 403)
