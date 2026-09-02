# DSL Architecture

## Overview

Backend logic is written as Ruuter DSL files — YAML workflows executed by the [Ruuter](https://github.com/buerokratt/Ruuter) engine.
Each `.yml` file defines a named sequence of steps (assign, switch, http call, template call, return).

## Directory Structure

```text
DSL/
  Ruuter/             — public-facing API endpoints (requires authentication)
    ljvis/
      GET/            — GET endpoints
        templates/    — shared reusable sub-workflows (called in-process, not exposed as public routes)
          validate/   — field format validators (email, personal code)
          user/       — user-entity validation templates
          audit/      — audit-event writers
      POST/           — POST endpoints

  Ruuter.internal/    — internal endpoints (restricted to internal IPs only)
    ljvis/
      POST/

  Resql/              — SQL query files executed by the Resql service
  DMapper/            — data mapping/transformation configs
  Liquibase/          — database schema migrations
```

## Guards (authentication & authorisation)

`ljvis` uses a **project-level guard** — `DSL/Ruuter/ljvis/.guard.yml` (Ruuter issue #39) —
which runs as the outermost guard on every route and every HTTP method. It authenticates the
session against TIM once (`templates/check-user-authority`) and passes the resolved user
object to every downstream guard and handler as `${auth_user}`.

- Per-resource `<dir>/.guard.yml` files are then just a permission `switch` on
  `${auth_user.permissions}` — no re-authentication.
- Guards stack (project → method-root → path-ancestors → target); all must pass.
- `declaration.override_ancestors: true` replaces all ancestors for a subtree — used for
  public routes (`auth/**`), dev mocks (`**/mock/**`), citizen TARA sessions
  (`v1/citizen/**`), and the standalone ERRU verb guards.
- Guard files use the `.guard.yml` extension (YAML tooling, `dsl-lint` globs). The bare
  `.guard` form also loads but is discouraged.
- CI (`guard-audit` job) boots the pinned Ruuter image and fails if `GET /_/unguarded`
  reports any route with zero applicable guards.

## Template Pattern (shared reusable logic)

Templates live in `GET/templates/` and are called in-process (no HTTP overhead). Ruuter
resolves `template: "templates/<name>"` against `GET/templates/<name>.yml` (the `requestType`
selects the method directory; templates are authored under `GET/`).

```yaml
some_step:
  template: "templates/template-name"
  requestType: GET
  body:
    field_name: ${variable}
  result: resultVar
  next: check_result
```

Templates expose their result via `return:` and the caller accesses it through `result`.

### Existing templates

| File | Purpose |
|------|---------|
| `check-user-authority.yml` | Validate JWT cookie via TIM, look up user + permissions |
| `validate/email.yml` | Validate email format (returns `"valid"` or structured error) |
| `validate/estonian-personal-code.yml` | Full isikukood validation: format, date, checksum |
| `user/validate-user-fields.yml` | All required-field + format validation for a user form submission |

## User Form Validation Pattern

All required-field and format validation for user insert/update is centralised in `user/validate-user-fields.yml`.
Calling DSLs need only two steps:

```yaml
validateUser:
  template: "[#LJVIS_PROJECT_LAYER]/user/validate-user-fields"
  requestType: templates
  body:
    first_name: ${first_name}
    last_name: ${last_name}
    personal_code: ${personal_code}
    organisation_id: ${organisation_id}
    structural_unit_id: ${structural_unit_id}
    job_title_name: ${job_title_name}
    email: ${email}
    access_start: ${access_start}
  result: field_error
  next: checkUser

checkUser:
  switch:
    - condition: ${field_error != 'valid'}
      next: propagate_error
  next: createUser
```

`user/validate-user-fields.yml` internally:
1. Checks each required field → returns `{type: VALIDATION_ERROR, field: "<camelCase>", code: "required"}` with 422 for the first empty field
2. Calls `validate/estonian-personal-code` for personal code format/checksum
3. Calls `validate/email` for email format
4. Returns `"valid"` if all checks pass

**Adding a new required user field** — edit only `user/validate-user-fields.yml`:
- Add field to `allowlist`
- Add `check_<field>` switch step
- Add `return_invalid_<field>` assign step with camelCase field name

## Validation Error Contract

When a validation step fails, templates return a **structured error object** (not a plain string).

### Backend (Ruuter template)

```yaml
return_invalid:
  assign:
    field_error:
      type: VALIDATION_ERROR
      field: personalCode          # matches the frontend form field name exactly
      code: invalid_estonian_personal_code  # stable machine-readable code
  next: emit_invalid

emit_invalid:
  status: 422
  return: ${field_error}
  next: end
```

The calling DSL propagates the object as-is:

```yaml
propagate_error:
  status: 422
  return: ${resultVar}
  next: end
```

### Response shape

```json
{
  "response": {
    "type": "VALIDATION_ERROR",
    "field": "personalCode",
    "code": "invalid_estonian_personal_code"
  }
}
```

- **`type`** — always `VALIDATION_ERROR`, used by frontend to identify the error class
- **`field`** — camelCase field name matching the frontend form field (Formik field key)
- **`code`** — stable snake_case identifier; frontend maps it to i18n message

### Frontend (automatic via `applyValidationError`)

See `frontend/src/shared/api/errors.ts`. The helper reads the structured body from `ApiError.body`
and calls `setFieldError(field, translate(code))` automatically — no manual `if` checks needed.

## YAML Authoring Rules

### Ternary expressions must be quoted

Any `assign` value containing `: ` (colon + space) — including ternary `? x : y` — **must be wrapped in double quotes**, otherwise the YAML parser misreads `: ` as a mapping separator.

```yaml
# ❌ breaks YAML parsing
century: ${a ? '18' : '19'}

# ✓ correct
century: "${a ? '18' : '19'}"
```

### Validate before committing

```bash
python3 -c "
import yaml, glob
for f in glob.glob('DSL/Ruuter/**/*.yml', recursive=True):
    try: yaml.safe_load(open(f))
    except yaml.YAMLError as e: print(f'FAIL {f}: {e}')
"
```
