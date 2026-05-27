# Master DSL Plan

See fail koondab viited kõigile epicu-põhistele DSL blueprint failidele.

## Epicud

### Epic 02

Kasutajate ja kasutajagruppide haldamine toimub Epic 02 (https://github.com/kemit-ee/ljvis-2/issues/2) ja selle alamtaskides #3–#8 kirjeldatud tingimustel. DSL failide blueprint asub failis [epic_02_dsl_plan.md](./epic_02_dsl_plan.md). Kasutab `state_updater` moodulit: `user_account_latest/build` ja `user_group_latest/build`.

### Epic 09

Klassifikaatorite haldamine toimub Epic 09 (https://github.com/kemit-ee/ljvis-2/issues/9) ja selle alamtaskides #10–#13 kirjeldatud tingimustel. DSL failide blueprint asub failis [epic_09_dsl_plan.md](./epic_09_dsl_plan.md). Kasutab `state_updater` moodulit: `classifier_latest/build` ja `classifier_value_latest/build`.

## Kasutusreegel

- Iga uue epicu kohta luuakse eraldi `epic_XX_dsl_plan.md` fail.
- See fail sisaldab lühiviidet epicule ja blueprint failile.
- `generate-resql-files` skill peab enne genereerimist looma või uuendama vastava epicu plaani.
- Blueprintid peavad kasutama Ruuteri sisekutsete kuju `[#LOCAL_RESQL]/ljvis2/v1/...` ja RESQL failiteid kujul `DSL/Resql/<MEETOD>/<moodul>/<entiteet>/v1/...`.
- `state_updater` endpointide kuju on erinev: `[#LOCAL_RESQL]/ljvis2/state_updater/<entiteet>/build` → fail `DSL/Resql/POST/state_updater/<entiteet>/build.sql` (ilma `v1/` kihita).
