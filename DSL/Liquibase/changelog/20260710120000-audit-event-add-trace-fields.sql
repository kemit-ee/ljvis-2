-- liquibase formatted sql
-- changeset ljvis:20260710120000

ALTER TABLE audit.audit_event
    ADD COLUMN IF NOT EXISTS trace_id TEXT,
    ADD COLUMN IF NOT EXISTS span_id  TEXT;

COMMENT ON COLUMN audit.audit_event.trace_id IS 'W3C tracecontext trace id (32 lowercase hex chars) extracted from the traceparent header of the originating HTTP request (format: 00-<trace_id>-<span_id>-<flags>). NULL when no traceparent header was present. Enables cross-reference with Grafana Tempo / Jaeger traces.';
COMMENT ON COLUMN audit.audit_event.span_id  IS 'W3C tracecontext span id (16 lowercase hex chars) of the request that produced the audit event, extracted from the traceparent header. NULL when no traceparent header was present.';

-- rollback ALTER TABLE audit.audit_event DROP COLUMN trace_id, DROP COLUMN span_id;
