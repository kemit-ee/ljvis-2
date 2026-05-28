# Generate-Functional-Tests Skill Usage Guide

This skill helps generate and expand Newman/Postman functional tests in the LJVIS project.

## Location

- `.skills/generate-functional-tests/SKILL.md` — full rules and process
- `.skills/generate-functional-tests/README.en.md` (this file)
- `.skills/generate-functional-tests/README.et.md`

## Quick start

1. Confirm the target endpoints/issues have DSL files in `DSL/Ruuter/ljvis/`.
2. Run the skill with: *"Generate functional tests for issue #N"* or *"Add tests for the users endpoints"*.
3. The skill reads Ruuter YML files to extract endpoints, permissions, and validation rules.
4. New test items are appended inside the correct folder in `tests/postman/ljvis-e2e-collection.json`.
5. Run the sanity check from SKILL.md Step 5 to verify no broken variable references.

## Core rules

- All tests live in one file: `tests/postman/ljvis-e2e-collection.json`.
- Domains are organized as top-level folders (Authentication, Organisations, Users, User Groups, …).
- Auth via `POST /ljvis/auth/dev/dev-login` — never real TARA/TIM flow.
- RESQL returns **all-lowercase** field names — assertions must match.
- Every protected endpoint needs a 403 test using the no-permission user (`cookie_noperm`).
- Created entity IDs are saved with `pm.environment.set` for sequential reuse.

## Running tests

```bash
# DEV stack (docker-compose.yml running)
newman run tests/postman/ljvis-e2e-collection.json \
  -e tests/postman/dev-stack-environment.json \
  --reporters cli

# CI stack (isolated)
newman run tests/postman/ljvis-e2e-collection.json \
  -e tests/postman/ci-stack-environment.json \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export report.html --bail

# Single folder
newman run tests/postman/ljvis-e2e-collection.json \
  -e tests/postman/dev-stack-environment.json \
  --folder "Users"
```

## Sharing with teammates

- Preferred: share via Git branch/PR containing the skill folder.
- Alternative: share `.skills/generate-functional-tests/` as a ZIP package.
- Always verify the target project uses the same Newman/Postman collection structure.
