---
name: generate-resql-files
description: |
  Generate RESQL SQL query files, mock query files, Ruuter DSL routing files, mock
  routing files, and .guard files for an epic, plus a documentation MD file.
  Use when the user says 'loo resql failid', 'loo mulle tehnilised failid', 'loo arendusfailid',
  'generate resql', 'create sql queries for epic', or asks for RESQL or Ruuter
  endpoint generation for an epic.
  Expects: epic issue number/link; reads epic + subtasks from GitHub issues.
---

# Generate RESQL Files

Produces the following for epic 09 — **kõik failid luuakse otse õigesse DSL kausta**:

```
DSL/Resql/
  POST/<moodul>/<entiteet>/v1/<operatsioon>.sql
  POST/<moodul>/<entiteet>/v1/mock_<operatsioon>.sql
  GET/<moodul>/<entiteet>/v1/<operatsioon>.sql    ← ainult parameetrita listid
  GET/<moodul>/<entiteet>/v1/mock_<operatsioon>.sql

DSL/Ruuter/
  api/
    POST/v1/admin/<entiteet>/
      .guard
      <operatsioon>.yml
      mock_<operatsioon>.yml
    GET/v1/admin/<entiteet>/
      .guard
      <operatsioon>.yml
      mock_<operatsioon>.yml

DSL/Liquibase/
  changelog/
    YYYYMMDDXXXX-selgitus-millega-tegu.sql
    YYYYMMDDXXXX-selgitus-millega-tegu-rollback.sql
    YYYYMMDDXXXX-selgitus-millega-tegu.xml
```

Dokumentatsioon:
- `docs/<epic_kataloog>/README.md` — kõik päringud, ruutingud, guard reeglid, arhitektuuri vastavus, mock andmed; sisaldab viidet paigaldusjuhendile
- `docs/<epic_kataloog>/paigaldusjuhend.md`
- `docs/db_errorhandling_rules.md`
- `docs/imp/epic_XX_dsl_plan.md`
- `docs/imp/master_dsl_plan.md`

## Rules (non-negotiable)

These rules come from project architecture constraints and database rules:

| Rule | Detail |
|------|--------|
| **INSERT and SELECT only** | UPDATE, DELETE, JOIN are forbidden |
| **No JOIN** | Use sub-queries (sub-SELECT) instead |
| **Fat snapshot reads** | Read models must query pre-joined `*_latest` tables |
| **One file = one query** | Never put multiple SQL statements in one file |
| **POST by default** | Use GET only for parameter-less list queries |
| **GET never accepts input** | GET SQL files must not contain `:variables` and GET Ruuter flows must not send request body, query params, or path params to RESQL |
| **camelCase output fields** | All output columns must use `AS "camelCase"` aliases |
| **Variables as `:variableName`** | camelCase, colon-prefixed |
| **Append-only state pattern** | State changes via INSERT to `_state`/`_status` table; current state = `ORDER BY created_at DESC LIMIT 1` |
| **Always return DB-confirmed result** | After INSERT, SELECT the inserted row back — never echo the input |
| **Success path must be explicit** | An operation is successful only when the expected DB-confirmed result is available; return that verified result and end the flow |
| **Mock queries must exist** | Every production query must have a corresponding `mock_` query returning hardcoded realistic data |
| **Business logic lives in Ruuter** | Failure-handling, rollback, state transition decisions and verification logic belong to Ruuter |
| **Verify-after-write is mandatory** | Success response is forbidden before the written row/state is re-read and verified |
| **Compensating rollback must be defined** | If later steps fail, Ruuter must trigger a compensating flow via RESQL |
| **Partial success must be handled** | Main record exists but `_state` is missing/invalid must be explicitly recovered or rolled back |
| **Liquibase on schema changes only** | If the epic creates or alters DB schema, generate Liquibase files under `DSL/Liquibase/changelog/`; pure DSL/RESQL/Ruuter changes do not require them |
| **Liquibase triplet is mandatory** | Every schema change must create forward SQL, symmetric rollback SQL, and XML changeset files |
| **Indexes are mandatory for state/read performance** | New or changed `_state`/`_status` and `*_latest` tables must get indexes based on real lookup and rebuild patterns |
| **Liquibase forward SQL must be guarded** | Table creation and column additions must check whether the object already exists so reruns add missing pieces instead of failing |
| **Liquibase schema comments are mandatory** | Every new or changed table and every new or changed column in Liquibase forward SQL must have English `COMMENT ON TABLE` and `COMMENT ON COLUMN` statements |

## When to Use

- When epic and subtask requirements exist in GitHub issues
- When `docs/data_model.md` is available for model validation
- When implementing or updating RESQL endpoints for an epic
- When mock data endpoints are needed for front-end development

## When Not to Use

- For DataMapper transformations → that is a separate skill

## Required Context

The user **must** provide:
- **Epic issue number or link** (e.g., `9` or `https://github.com/<org>/<repo>/issues/9`)

The skill reads automatically:
- `docs/data_model.md` — tables, columns, constraints, fat snapshot (`*_latest`) model
- Epic issue + epic subtasks from GitHub issues — business requirements and operations
- Existing SQL files in `DSL/Resql/` — to understand versioning and naming conventions

The skill also reads:
- `.skills/generate-resql-files/references/specification_format.md` — output format and versioning rules
- `docs/db_errorhandling_rules.md` — corner cases, state-management rules, verify-after-write and rollback requirements
- `planning/docs/permissions-matrix.md` (**fallback:** `docs/permissions-matrix.md`) — roles, permissions per endpoint, JWT claims used in guards
- `planning/docs/errors.json` (**fallback:** `docs/errors.json`) — error catalog and expected API error mapping
- Existing Ruuter DSL files in `DSL/Ruuter/` — to understand naming and routing conventions

---

## Process

### Step 0: Gather Inputs and Validate Sources

1. Read `.skills/generate-resql-files/references/specification_format.md`.
2. Determine epic issue number and epic slug from user input.
3. Derive epic number in two-digit form (`NN`) and epic branch name `feature/epic_NN_dsl`.
4. Read epic issue and all epic subtasks from GitHub.
5. Check that `docs/data_model.md` exists. If not → stop and ask user to provide/update it.
6. Read `docs/data_model.md`.
7. Check that `docs/db_errorhandling_rules.md` exists. If not → create/update it before generation work continues.
8. Read `docs/db_errorhandling_rules.md`.
9. Read `planning/docs/permissions-matrix.md`; if missing, read `docs/permissions-matrix.md`.
10. Read `planning/docs/errors.json`; if missing, read `docs/errors.json`.
11. Read existing files in `DSL/Resql/` and `DSL/Ruuter/` **only to understand naming/versioning conventions** — do NOT use existing folder layout to derive target paths for new files. Target paths come exclusively from the epic blueprint (Step 0.5) and the fixed folder schema defined in Step 5.
12. Detect whether the epic requires DB schema changes. If yes, plan Liquibase artifacts under `DSL/Liquibase/changelog/` and identify required indexes for `_state`/`_status` and `*_latest` tables before file generation.

### Step 0.5: Create Epic DSL Blueprint (mandatory)

1. Create or update `docs/imp/epic_XX_dsl_plan.md` for the current epic.
2. The file must contain enough detail that another LLM agent could generate the same DSL artifacts from it.
3. Include at minimum:
   - exact file list to be created or updated,
   - one-line purpose for every file,
   - detailed Ruuter control flow,
   - Liquibase file list for all schema changes (when applicable),
   - index plan for `_state`/`_status` and `*_latest` tables based on query patterns,
   - permission matrix based access table,
   - failure-handling and state-management flow for the epic,
   - checklist for SQL, Ruuter, guard and docs,
   - Mermaid flow for epic-specific Ruuter checks and decision points.
4. Create or update `docs/imp/master_dsl_plan.md` with an Estonian summary and link to the epic blueprint.
5. Do not generate SQL/YML files before this blueprint exists.

### Step 1: Data Model Analysis (blocking preflight gate)

1. Compare epic + subtask requirements against `docs/data_model.md`.
2. Validate architecture constraints:
   - Read models must rely on fat snapshot `*_latest` tables.
   - Query logic must not require SQL `JOIN`.
   - Write flows must follow append-only (`INSERT` only, no `UPDATE`, no `DELETE`).
   - Failure handling must follow `docs/db_errorhandling_rules.md`.
   - Verify-after-write must be present for all write flows.
   - Partial-success scenarios must be explicitly described.
3. Produce a preflight summary with:
   - `canContinue: yes/no`
   - Missing/ambiguous model pieces
   - Proposed data model changes (if any)
   - Planned endpoint/query list
   - Planned rollback/recovery paths
4. If `canContinue: no` (model gaps exist) → stop and report; otherwise proceed automatically to Step 2 or Step 3.

### Step 2: Data Model Gap Handling (if needed)

1. If required model pieces are missing in `docs/data_model.md`, prepare the missing model updates.
2. Create/update a branch for model updates and prepare a PR **towards `feature/planning`**.
3. Report PR link/summary to user and stop — model gaps must be resolved before generation continues.

### Step 3: Create/Checkout Epic DSL Branch

1. Ensure branch exists for generated DSL artifacts:
   - `feature/epic_NN_dsl` (NN = epic issue number, zero-padded)
2. If missing, create it automatically.
3. Checkout that branch automatically.
4. Never generate DSL artifacts on any other branch.

### Step 3.1: Create/Find Dedicated DSL Task Issue

1. Under the epic issue, create/find one task issue titled exactly: `DSL files for "<clean epic name>" (Epic NN)`.
   - Use only clean epic name (without `EPIC - NN -` prefix).
   - Example: `DSL files for "Klassifikaatorite haldamine" (Epic 09)`.
2. If missing, create it and set issue body exactly to: `Create DSL files accordig to "Epic name (link)" and its subtasks.`
3. If the task already exists but title/body differ, update them to match this format.
4. Add it under epic task list.
5. Use this task issue as the single tracking ticket for DSL artifact delivery.

### Step 4: Determine Mode

1. Check if epic-relevant files already exist in `DSL/Resql/*/iam/classifier/v1/*` and `DSL/Ruuter/api/*/v1/admin/classifiers*`.
2. If not → **Create mode** (Step 5). Proceed automatically.
3. If yes → **Update mode** (Step 6) by default. Proceed automatically.
   - Exception: if the user explicitly requests regeneration from scratch in their message, use **Create mode** (Step 5) instead, respecting versioning and never deleting existing files.

### Step 5: Create Mode

1. **Derive required operations** from the epic task list and data model:
   - For each entity: identify which CRUD-like operations tasks need (create, get-by-id, list, change-state, etc.)
   - Remember: no UPDATE/DELETE — state changes are INSERT to `_state` table
   - Map each operation to HTTP method (POST or GET per rules above)

2. **Mandatory folder schema — use ONLY these paths, never deviate based on existing DSL content:**

   > **CRITICAL:** Target file paths are determined SOLELY by (a) this fixed schema and (b) the exact file list in `docs/imp/epic_XX_dsl_plan.md`. Do NOT infer or copy paths from any existing files found in `DSL/Resql/` or `DSL/Ruuter/`. Existing files are only read to learn naming conventions, never to determine where new files go.

   ```
   DSL/Resql/
     POST/<moodul>/<entiteet>/v1/<operatsioon>.sql
     POST/<moodul>/<entiteet>/v1/mock_<operatsioon>.sql
     GET/<moodul>/<entiteet>/v1/<operatsioon>.sql
     GET/<moodul>/<entiteet>/v1/mock_<operatsioon>.sql
     POST/state_updater/<entiteet>/build.sql       ← *_latest snapshot rebuild (ei versiooni)
     POST/state_updater/<entiteet>/mock_build.sql
   DSL/Ruuter/
    api/
      POST/v1/admin/<entiteet>/
        .guard
        <operatsioon>.yml
        mock_<operatsioon>.yml
      GET/v1/admin/<entiteet>/
        .guard
        <operatsioon>.yml
        mock_<operatsioon>.yml
  DSL/Liquibase/
    changelog/
      YYYYMMDDXXXX-selgitus-millega-tegu.sql
      YYYYMMDDXXXX-selgitus-millega-tegu-rollback.sql
      YYYYMMDDXXXX-selgitus-millega-tegu.xml
  docs/<epic_kataloog>/
     README.md
     paigaldusjuhend.md
   ```

   Before writing any file, verify its target path against the blueprint file list. If the path is not in the blueprint, add it to the blueprint first.

2.1 **Translate epic blueprint into artifacts**:
   - `docs/imp/epic_XX_dsl_plan.md` is the single authoritative source for every file path. Generate exactly the files listed there — no more, no less.
   - If a file needs to be added that is not yet in the blueprint, update the blueprint first, then generate.
   - Never use paths derived from exploring `DSL/Resql/` or `DSL/Ruuter/` folder trees as generation targets.

3. **Write each production SQL file** following rules:
   - One SQL statement per file
   - Input variables as `:variableName` (camelCase)
   - Output columns as `AS "camelCase"`
   - For INSERTs: end with SELECT of the inserted row
   - For state changes: INSERT into `_state` table, then SELECT current state

3.1 **If schema changes are required, write Liquibase triplets** under `DSL/Liquibase/changelog/`:
   - `YYYYMMDDXXXX-selgitus-millega-tegu.sql`
   - `YYYYMMDDXXXX-selgitus-millega-tegu-rollback.sql`
   - `YYYYMMDDXXXX-selgitus-millega-tegu.xml`
   - The XML must reference both SQL files via `<sqlFile path="changelog/..." />` and `<rollback><sqlFile ... /></rollback>`
   - Add English `COMMENT ON TABLE` and `COMMENT ON COLUMN` statements for every new or changed table and column in the forward SQL
   - Add indexes for new/changed `_state`/`_status` and `*_latest` tables according to real `WHERE`, `ORDER BY`, latest lookup, and snapshot rebuild patterns
   - Guard DDL so reruns are safe: create tables with existence checks first, then add missing columns with `ADD COLUMN IF NOT EXISTS` or equivalent guarded logic
   - This rule is mandatory because the table may already exist while some required columns are still missing; the migration must still add the missing fields
   - If Liquibase files are listed in the blueprint, the skill must create them — listing without generation is forbidden

4. **Write each mock SQL file** (`mock_` prefix):
   - Returns hardcoded realistic Estonian test data
   - Same output structure (same column aliases) as production query
   - No table references needed — use `SELECT 'value' AS "fieldName", ...`
   - Include at least 2–3 rows for list queries

5. **Check versioning**: if any SQL file with the same path already exists, increment version suffix (e.g., `create_v2.sql`) and note the change in the documentation.

6. **Write Ruuter DSL routing files** under `DSL/Ruuter/`:
   - `DSL/Ruuter/api/<http_method>/v1/admin/<entiteet>/<operatsioon>.yml`
   - `DSL/Ruuter/api/<http_method>/v1/admin/<entiteet>/mock_<operatsioon>.yml`
   - RESQL call path inside Ruuter must use `[#LOCAL_RESQL]/ljvis2/v1/<moodul>/<entiteet>/<operatsioon>`
   - GET is allowed only for parameter-less list queries and must not pass any input to RESQL
   - Ruuter must contain the business flow, including validation, verify-after-write, failure path, and compensating rollback decisions.
   - If a write flow updates `_state`, the Ruuter flow must explicitly show: read latest state → copy/modify → write new state → verify returned state → call `state_updater` build → verify snapshot.
   - If an operation is `edit`, `update`, `create`, or any other write path that changes business data, the authorization layer must explicitly require the matching `*.edit` / `*.create` / write permission. If the folder-level `.guard` is intentionally broader than one endpoint, add an endpoint-level permission gate before the first write step.
   - Before every write that creates or mutates a code-bearing entity, call an existence/uniqueness precheck (for example `check_code_exists`) before the DB write and return a functional conflict if the code is already in use.
   - Success response is allowed only after the expected result is verified.
   - On success, return only the verified DB result (`db_response.response.body` or `verify_response.response.body`) and end the flow.

7. **Write `.guard` files** under `DSL/Ruuter/api/<http_method>/v1/admin/<entiteet>/.guard`.

7.1 **Guard strictness for write endpoints is mandatory**:
   - Read/list endpoints may share a broader folder-level `.guard` when the permission model allows it.
   - `edit` / `update` / `create` endpoints must still explicitly enforce the corresponding write permission.
   - If one folder contains both read and write endpoints and a single `.guard` cannot safely express both, keep the folder-level `.guard` as the broad baseline and add an endpoint-level permission check inside the write flow before any RESQL write call.

8. **Write `docs/<epic_kataloog>/paigaldusjuhend.md`** per specification format (deployment guide).

9. **Write documentation file** `docs/<epic_kataloog>/README.md` per specification format. The file must include a link to `paigaldusjuhend.md` at the top.

10. Report: files created, any architecture violations found, any open questions.

### Step 6: Update Mode

1. Read existing `docs/<epic_kataloog>/README.md`, existing SQL files, and existing `.guard` files.
2. Compare with current `docs/data_model.md` — identify new/changed/removed tables or columns.
3. Compare with `planning/docs/permissions-matrix.md` (fallback `docs/permissions-matrix.md`) — identify new/changed permissions.
4. For each change:
   - If a new operation is needed → create new SQL + mock SQL + Ruuter YML + mock YML + guard (if new module), add to docs
   - If a query must change due to schema change → create versioned SQL file (e.g., `get_by_id_v2.sql`) and corresponding versioned Ruuter YML (`get_by_id_v2.yml`), keep old files, add changelog entry
   - If schema changes are required → create matching Liquibase triplets and required indexes for affected `_state`/`_status` and `*_latest` tables, and add them to docs
   - If permissions changed → update affected `.guard` files, add changelog entry to docs
   - If an operation is removed → mark as deprecated in docs (do NOT delete any files)
5. Update the documentation file: increment version, add changelog entry.
6. Report: what changed, which files created/updated.

### Step 6.5: Sanity Check (mandatory)

Before commit, verify that every RESQL URL referenced from EPIC Ruuter files maps to an existing SQL file.

Run a check equivalent to:

```bash
for f in $(find DSL/Ruuter/api -name '*.yml'); do
  method=$(echo "$f" | sed -E 's|^DSL/Ruuter/api/([^/]+)/.*|\1|')
  grep -o '\[#LOCAL_RESQL\]/[^" ]*' "$f" | while read -r url; do
    rel=$(echo "$url" | sed 's|^\[#LOCAL_RESQL\]/||')
    project=$(echo "$rel" | cut -d'/' -f1)
    segment2=$(echo "$rel" | cut -d'/' -f2)
    test "$project" = "ljvis2" || echo "MISSING_PROJECT: $f -> $url"
    if [ "$segment2" = "state_updater" ]; then
      entity=$(echo "$rel" | cut -d'/' -f3)
      operation=$(echo "$rel" | cut -d'/' -f4)
      test -f "DSL/Resql/${method}/state_updater/${entity}/${operation}.sql" || echo "MISSING: $f -> $url"
    else
      version="$segment2"
      module=$(echo "$rel" | cut -d'/' -f3)
      entity=$(echo "$rel" | cut -d'/' -f4)
      operation=$(echo "$rel" | cut -d'/' -f5)
      test -f "DSL/Resql/${method}/${module}/${entity}/${version}/${operation}.sql" || echo "MISSING: $f -> $url"
    fi
  done
done
```

**URL kujud:**
- Tavalised RESQL endpointid: `[#LOCAL_RESQL]/ljvis2/v1/<moodul>/<entiteet>/<operatsioon>` → fail `DSL/Resql/<meetod>/<moodul>/<entiteet>/v1/<operatsioon>.sql`
- `state_updater` endpointid: `[#LOCAL_RESQL]/ljvis2/state_updater/<entiteet>/build` → fail `DSL/Resql/POST/state_updater/<entiteet>/build.sql` (ilma `v<N>/` tasemeta)

If any `MISSING:` entry appears, fix paths before proceeding.

### Step 7: Commit, Push, and Issue Update

#### 7a. Create issues BEFORE generating files

**Epic-level DSL issue** (one per epic):
- Title: `DSL files for "<epic name>" (Epic NN)`
- Body:
  ```
  > Parent epic: #<epic_issue_number>

  Create DSL files for "<epic name>" (Epic NN) and its subtasks.
  ```
- Note: GitHub sub-issues REST API returns 404 — use `> Parent epic:` body pattern instead.

**Per-subtask DSL issues** (one per epic subtask, e.g. Task 01…Task NN):
- Title: `DSL: Task NN – <task title>`
- Body:
  ```
  > Parent issue: #<task_issue_number>

  DSL files for "<task title>".

  ## Files
  - [ ] `DSL/Resql/POST/iam/<entity>/v1/<operation>.sql`
  - [ ] `DSL/Resql/POST/iam/<entity>/v1/mock_<operation>.sql`
  - [ ] `DSL/Ruuter/api/POST/v1/admin/<entity>/<operation>.yml`
  - [ ] `DSL/Ruuter/api/POST/v1/admin/<entity>/mock_<operation>.yml`
  ```
- `> Parent issue: #<task_issue>` makes the DSL issue visible under the task issue in GitHub.
- List only the files relevant to that specific task.
- Save all created issue numbers for use in commit messages and PR body.

#### 7b. Generate and commit files per subtask

For each subtask, commit its files separately:
```
git commit -m "DSL: Task NN – <task title>

Refs #<subtask_dsl_issue_number>"
```
- Use `Refs #XX` (not `Resolves`) — links commit to DSL issue timeline without closing it.
- The issue is closed via PR merge only.

#### 7c. Push and create PR

1. Push to `github` remote: `git push github feature/epic_NN_dsl`. Two remotes exist: `origin` = GitLab (do NOT push there), `github` = GitHub.
2. Check branches: `git ls-remote github 'refs/heads/*'`. If `feature/dsl` missing, create it: `git push github dev:refs/heads/feature/dsl`.
3. Create PR `feature/epic_NN_dsl → feature/dsl` with body listing ALL `Resolves` lines:
   ```
   Loodud RESQL SQL, mock SQL, Ruuter YML, mock YML ja .guard failid Epic NN jaoks.

   Resolves #XX  (DSL: Task 01 – <title>)
   Resolves #XX  (DSL: Task 02 – <title>)
   ...
   Resolves #XX  (DSL files for "<epic name>" – kogu epic)
   ```
4. Do NOT add `Resolves` for the epic issue itself — it must stay open.

#### 7d. Update epic-level DSL issue comment

Add a comment to the **epic-level DSL issue** with:
- `Commit: <github_commit_url>`
- `Created files: <number>`
- `Updated files: <number>`
- `PR: <github_pr_url>`

#### 7e. Update epic issue body

Append to the end of the **epic issue body** (do not modify existing content):
```markdown
## DSL

- [ ] #<epic_dsl_issue> [DSL files for "<epic name>" (Epic NN)](<issue_url>) — [PR #XX](<pr_url>) open
  - [ ] #XX DSL: Task 01 – <title>
  - [ ] #XX DSL: Task 02 – <title>
  - [ ] ...
```
- Use `- [x]` and update status to `merged` after PR is merged.

---

## Ruuter DSL Rules

Ruuter DSL files (`<operatsioon>.yml`) orchestrate the business flow: they validate input, call RESQL, handle errors, and return the DB-confirmed result.

**Location:** `DSL/Ruuter/api/<http_method>/v1/admin/<entiteet>/<operatsioon>.yml`
- Maps directly to public API path `/api/v1/admin/<entiteet>/<operatsioon>`
- One file = one operation (no combined logic)

**Production routing file structure:**

```yaml
declaration:
  call: declare
  version: 0.1
  description: "API route for POST /api/v1/admin/<entiteet>/<operatsioon>"
  method: post
  accepts: json
  returns: json
  namespace: admin

validate:
  switch:
    - condition: ${!incoming.body || !incoming.body.<requiredField>}
      next: bad_request
    - condition: true
      next: call_db

call_db:
  call: http.post
  args:
    url: "[#LOCAL_RESQL]/ljvis2/v1/<moodul>/<entiteet>/<operatsioon>"
    headers:
      type: json
    body:
      <param>: ${incoming.body.<param>}
  result: db_response
  next: return_result

return_result:
  return: ${db_response.response.body}

bad_request:
  status: 400
  return: "Missing required field(s)"
```

**Mock routing file structure** (`mock_<operatsioon>.yml`):

```yaml
declaration:
  call: declare
  version: 0.1
  description: "API route for POST /api/v1/admin/<entiteet>/mock_<operatsioon>"
  method: post
  accepts: json
  returns: json
  namespace: admin

call_mock:
  call: http.post
  args:
    url: "[#LOCAL_RESQL]/ljvis2/v1/<moodul>/<entiteet>/mock_<operatsioon>"
    headers:
      type: json
  result: mock_response
  next: return_result

return_result:
  return: ${mock_response.response.body}
```

**GET endpoint structure** (for parameter-less list queries only):

```yaml
declaration:
  call: declare
  version: 0.1
  description: "API route for GET /api/v1/admin/<entiteet>/<operatsioon>"
  method: get
  accepts: json
  returns: json
  namespace: admin

call_db:
  call: http.get
  args:
    url: "[#LOCAL_RESQL]/ljvis2/v1/<moodul>/<entiteet>/<operatsioon>"
  result: db_response
  next: return_result

return_result:
  return: ${db_response.response.body}
```

**Ruuter DSL rules:**
- Validate required input fields before calling RESQL
- Pass only needed fields to RESQL body (not the whole `incoming.body`)
- Always return `db_response.response.body` (not echoed input)
- For multi-step operations (create + verify): chain `call_db` → `verify_db` → `respond`
- Read operations succeed when RESQL returns the expected read result; return that DB result and end the flow
- Write operations succeed only after verify-after-write confirms the persisted result; then return the verified DB result and end the flow
- GET is allowed only for parameter-less list queries
- GET routes must not send `body`, query params, or path params to RESQL
- Mock YML calls mock RESQL endpoint — no hardcoded data in the YML itself
- Never duplicate RESQL logic in Ruuter — Ruuter only orchestrates
- All business logic, failure handling, rollback decisions, and state transition control must live in Ruuter
- For `_state` updates, Ruuter must read the latest state, copy the full record, modify required fields, write the new state, verify the returned state, then call `state_updater/<entiteet>/build` and verify the snapshot before success
- If main write succeeds but `_state` write, verification, or snapshot rebuild fails, Ruuter must run a compensating rollback or recovery flow
- Partial success must lead to explicit recovery/error flow, never silent success
- Retry/timeouts must be considered; define idempotency handling where duplicate execution is possible
- **Iteration over arrays must be done in RESQL, not Ruuter** — Ruuter does not support `forEach`; send the entire array to RESQL for processing
- Every `DSL/Ruuter/api` YAML file must start with a `declaration` step to avoid startup warnings and to keep OpenAPI generation populated
- Use named steps for all flow blocks; never put raw `switch:` or `return:` at YAML root level without a step name
- `switch` conditions must be valid DSL expressions such as `condition: ${...}` or `condition: true` with no trailing stray quotes

**Mandatory validation step before finishing a task:**
- Scan generated/edited `DSL/Ruuter/api/**/*.yml` files and verify that:
  - every file starts with a `declaration` step
  - no file contains root-level `switch:` without a step name before it
  - no file contains a blank `return:` line followed by another `return:` line
  - no `condition:` line ends with an accidental trailing `"`
  - no file uses `forEach`
  - POST routes use `call: http.post` + `args.url` + `headers.type: json`
  - GET routes use `call: http.get` + `args.url`

**Versioning:** same as RESQL — `<operatsioon>_v2.yml` when logic changes, keep old file

---

## Guard File Rules

`.guard` files are Ruuter DSL YAML files that enforce access control **before** any endpoint in the same folder (and subfolders) executes.

**Location:** `DSL/Ruuter/api/<http_method>/v1/admin/<entiteet>/.guard`
- One `.guard` file per module folder
- A `.guard` applies to all endpoints within that folder and its subfolders
- If different subfolders need different rules, place `.guard` in the subfolder

**Guard file structure:**

```yaml
# .guard — Access control for <moodul> endpoints
# Required permissions: <permission.code list>
# Allowed roles: <role list>

checkJwt:
  call: http.post
  args:
    url: "[#TIM_URL]/jwt/verify"
    body:
      jwt: ${incoming.headers.Authorization}
  result: jwt
  next: checkPermission

checkPermission:
  switch:
    - condition: ${jwt.response.body.permissions.includes('<required_permission>')}
      next: proceed
  next: forbidden

forbidden:
  return: "Access denied"
  status: 403
  next: end

proceed:
  next: end
```

**Guard rules:**
- JWT is always validated via TIM before any logic runs
- Permission check uses `permissions[]` array from JWT payload
- Role check uses `roles[]` array from JWT payload (for role-based rules)
- For scope enforcement (kontohaldur → only own institution): add `institution_id` check
- `anonüümne` endpoints (no auth required) must NOT have a `.guard` file
- Never hardcode user IDs or institution IDs in guard files — always from JWT

**Scope enforcement pattern (kontohaldur):**
```yaml
checkScope:
  switch:
    - condition: ${jwt.response.body.roles.includes('admin')}
      next: proceed
    - condition: ${jwt.response.body.institution_id == incoming.body.institutionId}
      next: proceed
  next: forbidden
```

---

## state_updater Module Rules

The `state_updater` module holds all `*_latest` snapshot rebuild SQL files. These are internal-only RESQL endpoints — no Ruuter YML files are created for them.

**Location:**
```
DSL/Resql/POST/state_updater/<entiteet>/build.sql
DSL/Resql/POST/state_updater/<entiteet>/mock_build.sql
```

**RESQL URL (called from other Ruuter flows):**
```
[#LOCAL_RESQL]/ljvis2/state_updater/<entiteet>/build
```

**Rules:**
- No `v1/` version layer — path is `state_updater/<entiteet>/build.sql` directly
- No Ruuter YML files — `state_updater` SQL files are called inline from other operation flows
- No `.guard` files — these endpoints are internal and never exposed as public API
- Every `build.sql` must have a corresponding `mock_build.sql` with the same output structure
- `build.sql` performs: `INSERT INTO <entiteet> (SELECT ... FROM source tables WHERE ...)` and ends with a `SELECT` of the inserted snapshot row
- Ruuter write flows that mutate data **must** call the relevant `state_updater/build` after the `_state` verify step, then verify the snapshot before returning success
- `mock_build.sql` returns hardcoded realistic test data matching the snapshot table columns

**Write flow order in Ruuter (mandatory for all write operations):**
1. Validate input
2. Write to main table (e.g. `classifier_name_state`) → verify-after-write
3. Call `state_updater/<entiteet>/build` → verify snapshot
4. Return success only after snapshot verify passes
5. If snapshot write or verify fails → run compensating rollback/recovery

---

## Versioning Rules

- Files are generated directly under `DSL/Resql/` and `DSL/Ruuter/`
- **Never delete or overwrite existing files**; create versioned files on change
- When a query must change: create `<operatsioon>_v2.sql` + `<operatsioon>_v2.yml` (and mock variants), keep old files
- Exception: if the service is not in use and user explicitly confirms migration cleanup, direct move/replace without alias or `_v2` is allowed
- When guard logic must change: update `.guard` in-place AND add changelog entry to docs
- `docs/<epic_kataloog>/README.md` tracks all versions in a changelog section
- The active version is always the highest-numbered one
- Liquibase handles schema changes; SQL file versioning handles query changes

---

## Important Reminders

> **Every time RESQL queries and Ruuter routes are created or updated:**
> 1. Create corresponding `mock_` SQL queries with the same output structure
> 2. Create corresponding `mock_` Ruuter YML files that call the mock RESQL endpoints
> 3. Create or verify `.guard` files for all non-public module folders
> 4. Update `docs/<epic_kataloog>/README.md` documentation
> 5. Verify all SQL queries comply with database constraints (no UPDATE, DELETE, JOIN)
> 6. Verify camelCase output aliases on all SELECT columns
> 7. Verify POST is used for all queries with parameters and GET is used only for parameter-less list queries
> 8. Verify Ruuter YML passes only needed fields to RESQL (not full body)
> 9. Verify `.guard` permission codes match exactly those in `planning/docs/permissions-matrix.md` (fallback `docs/permissions-matrix.md`)
> 10. Verify scope enforcement is present for `kontohaldur` role endpoints
> 11. For every write operation that changes a `*_latest` snapshot table: create `DSL/Resql/POST/state_updater/<entiteet>/build.sql` + `mock_build.sql`; verify Ruuter flow calls `state_updater` build and verifies the snapshot before success
> 12. After commit+push, update related GitHub issue(s) to confirm code has been created for the ticket
