-- liquibase formatted sql
-- changeset ljvis:20261201084000-rollback ignore:true splitStatements:false
CREATE OR REPLACE FUNCTION audit.generate_ulid() RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
    encoding  TEXT    := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    ts        BIGINT  := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
    rand_bytes BYTEA  := gen_random_bytes(10);
    result    TEXT    := '';
    i         INTEGER;
    v         BIGINT;
BEGIN
    -- 10-char timestamp part (48 bits, big-endian)
    FOR i IN REVERSE 9 .. 0 LOOP
        result := substr(encoding, (ts & 31)::INTEGER + 1, 1) || result;
        ts := ts >> 5;
    END LOOP;
    -- 16-char random part (80 bits)
    v := 0;
    FOR i IN 0 .. 9 LOOP
        v := (v << 8) | get_byte(rand_bytes, i);
    END LOOP;
    FOR i IN REVERSE 15 .. 0 LOOP
        result := result || substr(encoding, (v & 31)::INTEGER + 1, 1);
        v := v >> 5;
    END LOOP;
    RETURN result;
END $$;

COMMENT ON FUNCTION audit.generate_ulid() IS 'Generates a 26-character Crockford base32 ULID. Time-ordered (millisecond precision), globally unique, suitable as a primary key for audit_event.event_id. Used by insert_audit_event when the caller does not supply event_id.';
