-- liquibase formatted sql
-- changeset ljvis:20261229160000 ignore:true splitStatements:false
--
-- erru/nu/audit-event-exists looked up the NU inbound audit event with
-- `log_content @> jsonb_build_object('nuMessageKey', :message_key)`. With a custom plan PostgreSQL uses the GIN
-- index idx_ae_log_content_gin, but Resql reuses its prepared statement and PostgreSQL switches to a generic plan,
-- which scans linearly (the whole audit.audit_event table or all NU inbound events). The query now compares
-- `log_content->>'nuMessageKey'`, which this partial expression index serves in every plan.
-- The index covers only the NU inbound store events, so it stays small.

CREATE INDEX IF NOT EXISTS idx_ae_nu_inbound_message_key
    ON audit.audit_event ((log_content->>'nuMessageKey'))
 WHERE event_type = 'nu.inbound_request.store';
