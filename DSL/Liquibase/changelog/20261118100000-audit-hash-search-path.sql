-- liquibase formatted sql
-- changeset ljvis:20261118100000 ignore:true splitStatements:false
--
-- Turvakaristus: audit.chain() (tamper-evident hash-ahela BEFORE INSERT trigger)
-- ja audit.hash_personal_code() kutsuvad kvalifitseerimata `digest()` ilma
-- pinnitud search_path'ita. Trigger jookseb sisestava rolli õigustes ja
-- search_path'is — varju-`digest` varasemas skeemis võiks ahelat õõnestada või
-- isikukoode pealt kuulata. Fix: pinni search_path + kvalifitseeri
-- `public.digest` (pgcrypto on `public`-us).
--
-- EI muuda hash'ide väärtusi (sama digest, sama sool) → olemasolev
-- audit.audit_event ahel jääb kehtima.

CREATE OR REPLACE FUNCTION audit.chain() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
    prev bytea;
BEGIN
    SELECT row_hash INTO prev
      FROM audit.chain_tip
     WHERE id = 1
       FOR UPDATE;

    NEW.prev_row_hash := prev;
    NEW.row_hash := public.digest(
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
LANGUAGE sql STABLE
SET search_path = pg_catalog, public, pg_temp
AS $$
    SELECT CASE WHEN code IS NULL OR code = ''
                THEN NULL
                ELSE public.digest(code || (SELECT value FROM audit.config WHERE key = 'audit_salt'), 'sha256')
           END
$$;
