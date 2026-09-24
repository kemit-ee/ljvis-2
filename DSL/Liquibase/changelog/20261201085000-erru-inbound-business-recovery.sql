-- liquibase formatted sql
-- changeset ljvis:20261201085000 ignore:true splitStatements:false
-- Do not delete historical snapshots to force this migration through.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM erru.rsi_message
               WHERE direction = 'incoming' AND status = 'answered'
               GROUP BY technical_id HAVING count(*) > 1) THEN
        RAISE EXCEPTION 'Duplicate incoming RSI answered technical_id; run the ERRU preflight and reconcile snapshots before migration';
    END IF;
END $$;

CREATE TABLE erru.inbound_audit_key (
    key TEXT PRIMARY KEY,
    event_id TEXT NOT NULL UNIQUE
);
-- No FK: audit events may be archived independently; the deduplication record must survive.
COMMENT ON TABLE erru.inbound_audit_key IS
    'Durable inbound business audit deduplication. Written atomically with the immutable audit event; event_id retains the standard audit ULID format.';

CREATE UNIQUE INDEX uq_rsi_inbound_answered_technical_id
    ON erru.rsi_message (technical_id)
    WHERE direction = 'incoming' AND status = 'answered';

CREATE FUNCTION erru.record_inbound_audit(p_type TEXT, p_key BIGINT, p_description TEXT, p_content JSONB)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
    event_key TEXT := 'erru:' || p_type || ':' || p_key::text;
    existing_id TEXT;
BEGIN
    IF p_key IS NULL OR p_key <= 0 OR p_type IS NULL OR p_type NOT IN
        ('nu.inbound_request.store', 'ncr.inbound_request.serve', 'rsi.inbound_request.serve') THEN
        RAISE EXCEPTION 'Invalid inbound audit identity';
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(event_key, 0));
    SELECT event_id INTO existing_id FROM erru.inbound_audit_key WHERE key = event_key;
    IF existing_id IS NOT NULL THEN
        RETURN existing_id;
    END IF;
    existing_id := audit.generate_ulid();
    -- Do not use INSERT ON CONFLICT: audit.chain() updates chain_tip BEFORE insertion.
    INSERT INTO audit.audit_event(event_id, event_type, event_category, actor_name,
                                  description, log_content, created_by)
    VALUES (existing_id, p_type, 'erru_message_exchange', 'ERRU inbound service',
            p_description, p_content, 'system');
    INSERT INTO erru.inbound_audit_key(key, event_id) VALUES (event_key, existing_id);
    RETURN existing_id;
END;
$$;
COMMENT ON FUNCTION erru.record_inbound_audit(TEXT, BIGINT, TEXT, JSONB) IS
    'One audit event per inbound message and event type. Separate stable deduplication key; audit event_id remains a ULID. Both inserts commit or roll back together.';
