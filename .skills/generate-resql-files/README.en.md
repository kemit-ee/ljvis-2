# Generate-RESQL Skill Usage Guide

This skill helps generate and update DSL artifacts in the LJVIS project:
- Ruuter DSL (`.yml`)
- RESQL SQL (`.sql`)
- related documentation

## Location

- `.skills/generate-resql-files/SKILL.md`
- `.skills/generate-resql-files/references/specification_format.md`
- `.skills/generate-resql-files/README.en.md` (this file)
- `.skills/generate-resql-files/README.et.md`

## Quick setup

1. Copy `.skills/generate-resql-files/` into your project root under `.skills/`.
2. Ensure required input files exist (for example `docs/data_model.md`, `planning/docs/permissions-matrix.md` or fallback `docs/permissions-matrix.md`).
3. Confirm your project follows the same DSL conventions (Ruuter + RESQL path logic, issue/PR rules).
4. Verify the runtime services use project folder `/DSL/ljvis2/` for RESQL and `/DSL/api/` for Ruuter.

## Core rules

- One file = one operation.
- RESQL paths must be versioned (`v1`).
- Ruuter internal RESQL calls must use the form `[#LOCAL_RESQL]/ljvis2/<module>/<entity>/v1/...`.
- RESQL SQL files must live under `DSL/Resql/<METHOD>/<module>/<entity>/v1/...`.
- GET is allowed only for parameter-less list queries.
- Run a sanity check before commit.

## Recommended workflow

1. Prepare input documentation (epic, data model, permissions, errors).
2. Create or update DSL files according to skill rules.
3. Update README + installation guide in the target epic folder.
4. Run sanity check (`Ruuter URL -> existing RESQL SQL file`).
5. Commit, push, and update dedicated task issue + PR.

## Sanity check example

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
      module=$(echo "$rel" | cut -d'/' -f2)
      entity=$(echo "$rel" | cut -d'/' -f3)
      version=$(echo "$rel" | cut -d'/' -f4)
      operation=$(echo "$rel" | cut -d'/' -f5)
      test -f "DSL/Resql/${method}/${module}/${entity}/${version}/${operation}.sql" || echo "MISSING: $f -> $url"
    fi
  done
done
```

If output contains `MISSING:`, fix paths before merge. At runtime the same query is loaded under `/DSL/ljvis2/`.

## Sharing with teammates

- Preferred: share via Git branch/PR containing the skill folder.
- Alternative: share `.skills/generate-resql-files/` as a ZIP package.
- Always verify the target project uses the same DSL structure logic.
