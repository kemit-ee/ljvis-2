-- liquibase formatted sql
-- changeset ljvis:20261118100000 ignore:true splitStatements:false
-- Rollback: taasta 20260605100000 kuju (kvalifitseerimata digest, ilma search_path'ita).

CREATE OR REPLACE FUNCTION audit.chain() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    prev bytea;
BEGIN
    SELECT row_hash INTO prev
      FROM audit.chain_tip
     WHERE id = 1
       FOR UPDATE;

    NEW.prev_row_hash := prev;
    NEW.row_hash := digest(
        NEW.event_id || NEW.event_type ||
        NEW.created_at::text ||
        coalesce(encode(NEW.actor_personal_code_hash, 'hex'), '') ||
        NEW.log_content::text ||
        encode(prev, 'hex'),
        'sha256');

    UPDATE audit.chain_tip
       SET row_hash = NEW.row_hash
     WHERE id = 1;

    RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION audit.hash_personal_code(code TEXT) RETURNS BYTEA
LANGUAGE sql STABLE AS $$
    SELECT CASE WHEN code IS NULL OR code = ''
                THEN NULL
                ELSE digest(code || (SELECT value FROM audit.config WHERE key = 'audit_salt'), 'sha256')
           END
$$;
