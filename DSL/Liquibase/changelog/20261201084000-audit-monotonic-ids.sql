-- liquibase formatted sql
-- changeset ljvis:20261201084000 ignore:true splitStatements:false
CREATE OR REPLACE FUNCTION audit.generate_ulid() RETURNS TEXT
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
    alphabet CONSTANT TEXT := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    millis BIGINT;
    random_part BYTEA;
    candidate TEXT := '';
    previous_id TEXT;
    digit INTEGER;
    i INTEGER;
BEGIN
    -- Hold the same transaction lock as audit.chain() BEFORE allocating the ID.
    -- Concurrent inserts and multiple inserts in one millisecond must sort in chain order.
    PERFORM 1 FROM audit.chain_tip WHERE id = 1 FOR UPDATE;
    millis := floor(EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
    FOR i IN 1..10 LOOP
        candidate := substr(alphabet, (millis & 31)::INTEGER + 1, 1) || candidate;
        millis := millis >> 5;
    END LOOP;
    random_part := public.gen_random_bytes(16);
    FOR i IN 0..15 LOOP
        candidate := candidate || substr(alphabet, (get_byte(random_part, i) & 31) + 1, 1);
    END LOOP;
    SELECT event_id INTO previous_id FROM audit.audit_event
    WHERE event_id ~ '^[0-9A-HJKMNP-TV-Z]{26}$'
    ORDER BY event_id DESC LIMIT 1;
    IF previous_id IS NOT NULL AND candidate <= previous_id THEN
        candidate := previous_id;
        FOR i IN REVERSE 26..1 LOOP
            digit := strpos(alphabet, substr(candidate, i, 1)) - 1;
            IF digit < 31 THEN
                candidate := overlay(candidate placing substr(alphabet, digit + 2, 1) from i for 1);
                RETURN candidate;
            END IF;
            candidate := overlay(candidate placing '0' from i for 1);
        END LOOP;
        RAISE EXCEPTION 'Audit ULID exhausted';
    END IF;
    RETURN candidate;
END $$;
COMMENT ON FUNCTION audit.generate_ulid() IS
    'Canonical audit ULID allocated under the hash-chain transaction lock. Monotonic for immediate inserts, including same-millisecond inserts and clock rollback. Do not preallocate IDs outside the insertion transaction.';
