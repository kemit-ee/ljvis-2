-- Diagnostic companion to migrate.py preflight. Scalar-key assumptions are
-- derived from each transform by the coordinator, scoped by form type/cutoff/
-- status, persisted as findings, and block EVEN --rehearsal before any INSERT.
-- Avoid a second manually maintained key list here.
-- psql -X -v ON_ERROR_STOP=1 -v run_id=<uuid> -f sql/98-guard-multivalue.sql
SELECT legacy_source,legacy_id,issue,detail FROM migration.finding
WHERE migration_run_id=:'run_id' AND issue='multivalue_scalar'
ORDER BY legacy_source,legacy_id;
