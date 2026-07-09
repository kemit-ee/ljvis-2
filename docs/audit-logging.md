# Audit event logging

## Overview

All audit events are written to the `audit.audit_event` table via RESQL (`POST [LJVIS_RESQL]/log/insert_audit_event`). The table is **INSERT-only** — rows are never deleted or updated.

---

## Logged fields

| Field | Description |
|---|---|
| `event_id` | ULID (26-char base32 crockford). Time-ordered, sortable, globally unique. Used as the primary key. |
| `event_type` | Action type (see list below) |
| `event_category` | Domain: `user_management`, `user_group_management`, `classifier_management`, `control_form_management` |
| `event_time_server` | `timestamptz`, default `now()`. Server-authoritative timestamp. |
| `actor_name` | Actor's name (sourced from JWT) |
| `actor_personal_code_hash` | SHA-256 hash of the actor's personal code, keyed with the audit salt (`sha256(personalCode || audit_salt)`); sourced from JWT. Cleartext personal codes are never stored. |
| `trace_id` | W3C tracecontext trace id (32-hex), extracted from the `traceparent` header on the originating request. Enables cross-reference with Grafana Tempo / Jaeger. See `rest-api-design-guide.md` §10. |
| `span_id` | W3C tracecontext span id (16-hex) of the request that produced the event. |
| `description` | Human-readable Estonian description |
| `log_content` | JSON object with additional data |
| `prev_row_hash` | `bytea`. `row_hash` of the previous audit row in insertion order. Written by DB trigger, not by DSL. See "Hash chain integrity" below. |
| `row_hash` | `bytea`. `sha256(canonical(row) || prev_row_hash)`. Written by DB trigger. |
| `created_by` | Same as `actor_name` |

---

## Event types and conditions

| `event_type` | `event_category` | When logged |
|---|---|---|
| `user.view` | `user_management` | **Always** when opening a user's detail view |
| `user.list.view` | `user_management` | **Always** when viewing the user list |
| `user.list.search` | `user_management` | **Only** when `search.length >= 3` |
| `user.create` | `user_management` | **Always** when creating a new user |
| `user.update` | `user_management` | **Always** when updating user data |
| `user.set_groups` | `user_management` | **Always** when saving group memberships (even an empty change) |
| `user_group.update` | `user_group_management` | **Always** when updating a group (users, organisations, permissions) |
| `classifier.view` | `classifier_management` | **Always** when opening a classifier's detail view |
| `classifier.list.search` | `classifier_management` | **Only** when `search.length >= 3` |
| `classifier_value.update` | `classifier_management` | **Always** when changing a classifier value's validity |
| `control_form.foreign_violation.create` | `control_form_management` | **Always** when creating a new foreign violation form (first save) |
| `control_form.foreign_violation.update` | `control_form_management` | **Only** when at least one field changed (compared to the previous snapshot) |
| `control_form.foreign_violation.view` | `control_form_management` | **Only** when the viewer differs from the form's creator |
| `authz.denied` | matching resource | **Always** when `.guard` or an endpoint denies access due to a missing permission (403). `log_content.requiredPermission`, `log_content.endpoint`. |
| `authz.scope_violation` | matching resource | **Always** when a local-scope user attempts to access a resource in a different organisation. `log_content.attemptedOrganisationId`, `log_content.actorOrganisationId`. |
| `input.rate_limited` | matching resource | **Always** when a request is rejected due to a rate-limit violation (429). `log_content.limitBucket`, `log_content.retryAfterSeconds`. |

---

## Logging workflow

Every Ruuter YML follows the same template:

```
1. get_user_context    → sources user data from JWT
2. Business logic      → RESQL query (INSERT/UPDATE)
3. buildAuditLog       → composes description and log_content JSON
4. logAuditEvent       → INSERT audit.audit_event (via RESQL)
5. mapResponse         → response transform (DMAPPER)
6. returnSuccess       → response to client
```



> **NB!** On write operations the event is logged **before** the response is returned (step 4 before 5).
> On read operations (list, view) the event is logged **after** the RESQL response arrives. Personal codes are hashed with `sha256(personalCode || audit_salt)` in the `buildAuditLog` step before the `insert_audit_event` call — cleartext personal codes never reach the `audit.audit_event` table (see `logging-spec.md` §6 and item 19).

---

## Conditional logging

Some operations are logged only under certain conditions:

```
search.length >= 3  →  user.list.search      (user search)
search.length >= 3  →  classifier.list.search (classifier search)
```

Without a search, a list view logs `user.list.view` but no separate search event.

---

## `log_content` field structure by example

**`user.view`**
```json
{
  "targetPersonalCodeHash": "sha256:9f2c4b8e…d1a0",
  "targetNameInitials": "K.S.",
  "scope": "allOrganisations",
  "organisationId": null
}
```

**`user.update`** (with organisation change)
```json
{
  "targetPersonalCodeHash": "sha256:9f2c4b8e…d1a0",
  "targetNameInitials": "K.S.",
  "changedFields": ["organisation_id", "email"],
  "previousOrganisationId": 1,
  "newOrganisationId": 2,
  "removedGroupIds": [10, 11]
}
```

**`user.set_groups`**
```json
{
  "targetPersonalCodeHash": "sha256:9f2c4b8e…d1a0",
  "targetNameInitials": "K.S.",
  "addedGroupIds": [3, 5],
  "removedGroupIds": [1]
}
```

**`user_group.update`** (adding users)
```json
{
  "targetGroupId": 7,
  "changedFields": [],
  "addedOrganisationIds": [],
  "removedOrganisationIds": [],
  "addedPermissionCodes": [],
  "removedPermissionCodes": [],
  "addedUserPersonalCodeHashes": ["sha256:9f2c4b8e…d1a0", "sha256:71bfa03e…af12"],
  "removedUserPersonalCodeHashes": [],
  "cascadeRemovedPersonalCodeHashes": []
}
```

**`classifier.view`**
```json
{
  "classifierId": "42",
  "classifierCode": "RTK"
}
```

**`control_form.foreign_violation.create`**
```json
{
  "formKey": "vr-2026-00001/V"
}
```

**`control_form.foreign_violation.update`**
```json
{
  "formKey": "vr-2026-00001/V",
  "changedFields": ["reporting_country_code", "sanction_code"]
}
```

**`control_form.foreign_violation.view`**
```json
{
  "formKey": "vr-2026-00001/V"
}
```

---

## Data flow sequence diagrams

### Write operation (e.g. `user.create`, `user.update`)

```mermaid
sequenceDiagram
    participant K as Client
    participant R as Ruuter
    participant T as TIM (JWT)
    participant DB as RESQL / DB
    participant DM as DMAPPER

    K->>R: POST /v1/users/admin {body}
    R->>T: check-user-authority (cookie)
    T-->>R: auth_user {firstname, lastname, personalcode}
    R->>R: extractRequestData
    R->>R: validate-user-fields (template)
    alt Validation error
        R-->>K: HTTP 422 {field_error}
    else Personal code conflict
        R->>DB: check_personal_code_conflict
        DB-->>R: [{id}]
        R-->>K: HTTP 409 "personal code already exists"
    else OK
        R->>DB: insert_user_account
        DB-->>R: {new user row}
        R->>R: buildAuditLog — compose description and log_content
        R->>DB: insert_audit_event {event_type:"user.create", ...}
        DB-->>R: ok
        R->>DM: map_user {users}
        DM-->>R: {mapped user}
        R-->>K: HTTP 200 {user detail}
    end
```

### Read operation with a list (e.g. `user.list.*`)

```mermaid
sequenceDiagram
    participant K as Client
    participant R as Ruuter
    participant T as TIM (JWT)
    participant DB as RESQL / DB
    participant DM as DMAPPER

    K->>R: GET /v1/users/admin/search?q=...&page=...&pageSize=...
    R->>T: check-user-authority (cookie)
    T-->>R: auth_user
    R->>R: extractRequestData
    R->>DB: list_users {search, page, pageSize, sorting, organisation_id}
    DB-->>R: [{user rows}]
    R->>DM: map_users_list {users}
    DM-->>R: {content:[], total:N}
    alt search.length >= 3
        R->>DB: insert_audit_event {event_type:"user.list.search", searchTerm, resultCount}
        DB-->>R: ok
    end
    R->>DB: insert_audit_event {event_type:"user.list.view", page, resultCount}
    DB-->>R: ok
    R-->>K: HTTP 200 {content, total}
```

### Read operation with a detail view (e.g. `user.view`, `classifier.view`)

```mermaid
sequenceDiagram
    participant K as Client
    participant R as Ruuter
    participant T as TIM (JWT)
    participant DB as RESQL / DB
    participant DM as DMAPPER

    K->>R: GET /v1/users/admin?q=...
    R->>T: check-user-authority (cookie)
    T-->>R: auth_user
    R->>R: extractRequestData
    R->>DB: get_user {id, organisation_id:""}
    DB-->>R: [{user row}]
    R->>R: buildAuditLog — hashes personal code, composes name initials
    R->>DB: insert_audit_event {event_type:"user.view", targetPersonalCodeHash, targetNameInitials}
    DB-->>R: ok
    R->>DM: map_user {users}
    DM-->>R: {mapped user}
    R-->>K: HTTP 200 {user detail}
```

### Updating a group's users (e.g. `user_group.update`)

```mermaid
sequenceDiagram
    participant K as Client
    participant R as Ruuter
    participant T as TIM (JWT)
    participant DB as RESQL / DB

    K->>R: PUT /v1/user-groups/users {id, userIds}
    R->>T: check-user-authority (cookie)
    T-->>R: auth_user
    R->>R: extractRequestData
    R->>DB: get_user_group {id} — fetches the group name
    DB-->>R: [{name:"..."}]
    alt userIds is empty
        R->>R: buildEmptyAuditEvent
    else
        R->>DB: set_user_group_users {user_group_id, user_ids, status:"active"}
        DB-->>R: ok
        R->>DB: get_users_by_ids {user_ids} — fetches personal codes (hashed before serialisation)
        DB-->>R: [{personalCode}, ...]
        R->>R: buildAuditEvent — hashes and composes addedUserPersonalCodeHashes
    end
    R->>DB: insert_audit_event {event_type:"user_group.update", addedUserPersonalCodeHashes, ...}
    DB-->>R: ok
    R-->>K: HTTP 200 "ok"
```

---

## Hash chain integrity

Append-only guarantees "a written row does not change." It does **not**
guarantee "a written row does not disappear." Row deletion, a stray
`TRUNCATE`, or a manual `INSERT` with a backdated timestamp are all
possible for anyone with DB-level access — DBA, break-glass session,
misconfigured migration. Without tamper-evidence, "was this row ever
there?" cannot be answered.

**Invariant.** Every row in `audit.audit_event` carries a `row_hash`
that is `sha256(canonical(row) || prev_row_hash)`, where `prev_row_hash`
is the previous row's `row_hash`. Any change — insertion, deletion,
edit — breaks the chain at the following row.

### Implementation: PostgreSQL `BEFORE INSERT` trigger

The chain is written by a database trigger. Application DSL, RESQL
templates, and manual `psql` sessions all pass through it — there is no
code path that can insert without extending the chain.

```sql
CREATE TABLE audit.chain_tip (
  id       smallint PRIMARY KEY DEFAULT 1,
  row_hash bytea    NOT NULL     DEFAULT '\x00',
  CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO audit.chain_tip DEFAULT VALUES;

CREATE FUNCTION audit.chain() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE prev bytea;
BEGIN
  SELECT row_hash INTO prev
    FROM audit.chain_tip
    WHERE id = 1
    FOR UPDATE;
  NEW.prev_row_hash := prev;
  NEW.row_hash := digest(
    NEW.event_id::text || NEW.event_type ||
    NEW.event_time_server::text ||
    coalesce(NEW.actor_personal_code_hash, '') ||
    NEW.log_content::text ||
    encode(prev, 'hex'),
    'sha256');
  UPDATE audit.chain_tip
    SET row_hash = NEW.row_hash
    WHERE id = 1;
  RETURN NEW;
END $$;

CREATE TRIGGER audit_event_chain
  BEFORE INSERT ON audit.audit_event
  FOR EACH ROW EXECUTE FUNCTION audit.chain();
```

`SELECT ... FOR UPDATE` on the single-row `chain_tip` serialises
concurrent INSERTs within a transaction — no chain fork.

### Verification: `GET /v1/logs/verify`

The verifier walks the chain in event_id order and compares each row's
stored `row_hash` against a recomputed value. First mismatch → chain
breach at that row. See `docs/openapi.yaml` `getLogsVerify` for the
response shape.

Baseline check query:

```sql
WITH ordered AS (
  SELECT
    event_id,
    row_hash,
    prev_row_hash,
    LAG(row_hash) OVER (ORDER BY event_id) AS expected_prev
  FROM audit.audit_event
)
SELECT event_id
FROM ordered
WHERE prev_row_hash IS DISTINCT FROM COALESCE(expected_prev, '\x00');
```

The first returned `event_id` is the breach location. An empty result
set means "chain intact over the checked range."

### External anchoring (deferred)

The chain proves **continuity**, not **truth**: an attacker who rewrites
the whole table from time `T` (recomputing hashes as they go) produces
an intact-looking chain. Rangeguard against this by periodically
anchoring the current chain tip externally — a WORM-locked S3 object,
a separate log service, or (for the strictest requirements) a public
transparency log. Anchoring frequency vs incident-detection-window is a
policy decision, not encoded here.

---

## References

- Audit table definition: `DSL/Liquibase/changelog/20260605100000-initial-audit.sql`
- Audit read endpoints: `DSL/Ruuter/ljvis/GET/v1/logs/`
- OpenAPI: `docs/openapi.yaml` — tags `logs`, `foreign-violation-forms`
