# Master DSL Plan

See fail koondab viited kõigile epicu-põhistele DSL blueprint failidele.

## Epicud

### Epic 09

Klassifikaatorite haldamine toimub Epic 09 (https://github.com/kemit-ee/ljvis-2/issues/9) ja selle alamtaskides #10–#13 kirjeldatud tingimustel. DSL failide blueprint asub failis [epic_09_dsl_plan.md](./epic_09_dsl_plan.md).

## Kasutusreegel

- Iga uue epicu kohta luuakse eraldi `epic_XX_dsl_plan.md` fail.
- See fail sisaldab lühiviidet epicule ja blueprint failile.
- `generate-resql-files` skill peab enne genereerimist looma või uuendama vastava epicu plaani.
- Blueprintid peavad kasutama Ruuteri sisekutsete kuju `[#LOCAL_RESQL]/ljvis2/v1/...` ja RESQL failiteid kujul `DSL/Resql/<MEETOD>/<moodul>/<entiteet>/v1/...`.
