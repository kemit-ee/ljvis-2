-- liquibase formatted sql
-- changeset ljvis:20260826100000 ignore:true
-- LJVIS2-56: extends xroad.xroad_integration_log (20260727120000) with the
-- extra context fields the e-Toimik AnnaIsikuKvalifikatsioonid integration's
-- own acceptance criteria require: person_identifier (must be recorded in
-- plaintext for Estonian citizens, and left NULL when the caller identified
-- the person by name+birthdate instead — i.e. a foreigner, per LJVIS2-56 §7
-- Logimine) and an optional source context (which feature/record triggered
-- the query — e.g. a compound_form key from the new manual query UI, or a
-- future nightly-batch job id) for traceability. All three columns are
-- nullable so every existing caller of xroad/log_integration.sql (paring2,
-- lihtandmed, etc.) keeps working unmodified.
ALTER TABLE xroad.xroad_integration_log
    ADD COLUMN person_identifier TEXT,
    ADD COLUMN source_type       VARCHAR(50),
    ADD COLUMN source_record_id  VARCHAR(100);

COMMENT ON COLUMN xroad.xroad_integration_log.person_identifier IS 'Personal code (isikukood) of the person the query was about, in plaintext, ONLY when the caller identified them by personal code (Estonian citizen). NULL when identification was by name+birthdate (foreigner) — per LJVIS2-56 §7 Logimine, foreigners'' personal identifiers are never recorded. NULL for all other (non-etoimik) integration log rows too.';
COMMENT ON COLUMN xroad.xroad_integration_log.source_type IS 'Optional caller-supplied context: which feature/entity triggered this integration call, e.g. ''compound_form''. NULL when not supplied (most existing callers).';
COMMENT ON COLUMN xroad.xroad_integration_log.source_record_id IS 'Optional caller-supplied context: the specific record identifier within source_type, e.g. a compound_form_key. NULL when not supplied.';
