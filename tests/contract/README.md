# NU contract checks

`validate-dsl` runs static field/SQL comparisons and mutation tests using Python's standard library; no Docker is needed for these checks:

```sh
python3 -B tests/contract/check_erru_contract.py
python3 -B -m unittest discover -s tests/contract -p 'test_*.py'
```

`tests/postman/run-all.sh` runs PostgreSQL checks on the E2E database after Liquibase/bootstrap and before Newman. `check_erru_contract.py --emit-sql` generates XSD boundary/enum/required-field cases and appends `tests/sql/erru-nu-validation-and-exchange.sql` for validation diagnostics, send, ACK and EN scenarios. Both suites roll back their fixture rows; PostgreSQL sequences may advance. They use the already migrated schema, with no separate container or migration bootstrap.

To repeat only the database checks against a running CI stack:

```sh
set -o pipefail
python3 -B tests/contract/check_erru_contract.py --emit-sql | docker compose -f docker-compose.ci.yml -p ljvis-ci exec -T database psql -X -q -o /dev/null -v ON_ERROR_STOP=1 -U ljvis -d ljvis_db
```

The mapping connects DTO fields, XSD types and database columns. Limits and enum lists come from XSD. Static checks inspect specific SQL guards and effective storage widths, ignore comments and fail when a known rule becomes unrecognizable. New NU migrations require a review of the static mapping. Mutation tests prove that changed XSD/SQL rules fail, even when an old number remains elsewhere in SQL. SQL emission fails before output on a detected mismatch; the E2E pipeline propagates generator and PostgreSQL failures.

On XSD upgrade, replace the tested bundle or update `SCHEMAS` to the new directory. CI rejects covered NU contract mismatches and unexpected namespace/version changes. See [schema provenance](../../contracts/erru/3.5/README.md).

Coverage is limited to NU Request, ACK and related EN. Empty optional DTO strings represent omitted XML attributes. Application policy may be stricter than XSD. The future SOAP adapter still needs tests of its actual XML serialization against the schemas.

# DSL security rules (epic #502)

`check_dsl_security.py` keeps the identity and ownership fixes from regressing (R1–R8: no identity or guard-injected fields in allowlists, identity never from the request body, allowlist on every handler, strict identity-bearing templates, upload prefix, read-ownership check before every form read, template call contract, no identity fields in the frontend). `test_dsl_security.py` mutates a temp copy of the tree and proves each rule fails when its fix is reverted.

```sh
python3 tests/contract/check_dsl_security.py
python3 -B -m unittest tests/contract/test_dsl_security.py
```

Guards (`*.guard.yml`) are exempt from the allowlist rule: they are allow-all or read only headers, and an allowlist there could filter the handler's input.


# SQL append-only invariant (epic #522)

`check_resql_append_only.py` keeps every Resql template under `DSL/Resql/` to `INSERT` + `SELECT`: no `UPDATE` / `DELETE` / `TRUNCATE` / `MERGE` (A1, this also catches `ON CONFLICT ... DO UPDATE`), no `JOIN` / `LATERAL` (A2) and a YAML header that parses (A4). Comments, string literals and quoted identifiers are stripped first. `SELECT ... FOR UPDATE` is a lock, not a write, and is allowed. `test_resql_append_only.py` proves each construct is flagged.

```sh
python3 tests/contract/check_resql_append_only.py
python3 -B -m unittest tests/contract/test_resql_append_only.py
```

The only exemption is the retention-purge `DELETE` (`DSL/Resql/ljvis/POST/archive/purge_confirmed.sql`), listed with a rationale in `.sql-rule-exemption`. An entry must sit under an `archive/` directory, may contain nothing but that `DELETE`, and fails CI when it no longer matches a violation. The 3-step contract (select and copy, verify in the archive, delete) is in ADR-013.

Known limits: an implicit comma join (`FROM a, b WHERE ...`) is not detected; review it by hand. Rewrite a `JOIN` as `WHERE x = ANY (SELECT ...)`, `EXISTS` or a correlated scalar subquery (`(SELECT c FROM t c WHERE ... ORDER BY created_at DESC LIMIT 1)` for the latest snapshot).
