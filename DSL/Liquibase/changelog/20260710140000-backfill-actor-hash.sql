-- liquibase formatted sql
-- changeset ljvis:20260710140000 ignore:true
-- Backfill: hash existing cleartext actor_personal_code rows and drop the old column.
-- Idempotent: ADD COLUMN IF NOT EXISTS / DROP COLUMN IF EXISTS guards allow safe re-run.
-- Rollback: re-adds actor_personal_code as nullable TEXT (data is NOT restored — take a backup first).

-- Step 1: Ensure actor_personal_code_hash column exists (idempotent for DBs already migrated)
ALTER TABLE audit.audit_event
    ADD COLUMN IF NOT EXISTS actor_personal_code_hash BYTEA;

-- Step 2: Hash any remaining cleartext rows (only if the cleartext column still exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'audit'
          AND table_name   = 'audit_event'
          AND column_name  = 'actor_personal_code'
    ) THEN
        UPDATE audit.audit_event
        SET actor_personal_code_hash = audit.hash_personal_code(actor_personal_code)
        WHERE actor_personal_code IS NOT NULL
          AND actor_personal_code <> ''
          AND actor_personal_code_hash IS NULL;
    END IF;
END $$;

-- Step 3: Drop the cleartext column
ALTER TABLE audit.audit_event
    DROP COLUMN IF EXISTS actor_personal_code;

COMMENT ON COLUMN audit.audit_event.actor_personal_code_hash IS 'SHA-256 of the actor personal code salted via audit.hash_personal_code(): digest(personal_code || audit_salt, ''sha256''). Salt is stored in audit.config. Computed by RESQL insert_audit_event at write time. NULL if personal code is NULL or empty. Cleartext personal codes are never stored.';
