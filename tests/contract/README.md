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
