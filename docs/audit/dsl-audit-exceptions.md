# DSL audit — erandid

Allikas: Ruuter `GET /_/audit/dsl` ja `dsl-lint --audit` (Ruuter #146), versioon 0.12.1-rc.
Seis 2026-10-08: **0 viga ja 0 hoiatust** mõlemas puus (`scripts/dsl-audit.sh`; CI "Guard Audit" ja "DSL Lint").
Info-taseme leidude hetktõmmis: [`dsl-audit-baseline.json`](dsl-audit-baseline.json).

CI ebaõnnestub iga vea- või hoiatustaseme leiu peale. Erandi lisamiseks tuleb see siia kirja panna (reegel, DSL, tähtaeg, kinnitaja) ja skripti filtrit vastavalt laiendada.

Info-taseme leiud (`returns_missing`, `body.type_missing`) on teadlikult lahti: `returns:` skeem eeldab objekti-kujulist vastust (enamik DSL-e tagastab Resqli massiivi) ja `body.type_missing` lisamine kehtestaks käitusajal tüübikontrolli (400), mistõttu vajab see kliendipoolset kontrolli. Need ei nõua praegu tegevust; `internal:` poliitika otsus (`declarations.default_internal`) on epiku skoobist väljas.

## Erandite register

| Reegel | DSL | Tähtaeg | Kinnitas |
|---|---|---|---|
| — | — | — | — |
