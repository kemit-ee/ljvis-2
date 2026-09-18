-- liquibase formatted sql
-- changeset ljvis:20260918100000
-- LJVIS2-56: adds a result_status column to xroad.xroad_integration_log so
-- the "found / not_found / error" classification the e-Toimik DSL flows
-- already compute (logSuccessFound/logSuccessNotFound/logFailure branches,
-- and the cron flows' decision.found/decision.success) is recorded
-- explicitly instead of having to be re-derived from request_xml/
-- response_xml text later (fragile and service-specific — the cron flows'
-- "not found" case has two distinct raw-response shapes). Powers the new
-- Haldus > eToimiku X-tee logid list view's status filter.
ALTER TABLE xroad.xroad_integration_log
    ADD COLUMN IF NOT EXISTS result_status VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_xroad_integration_log_result_status
    ON xroad.xroad_integration_log (result_status);

COMMENT ON COLUMN xroad.xroad_integration_log.result_status IS 'Caller-supplied outcome classification: ''found'' (a usable match was returned), ''not_found'' (call succeeded but nothing matched), ''error'' (the X-Road/XTR call itself failed). NULL for integration log rows written before this column existed or by callers that do not yet set it.';
