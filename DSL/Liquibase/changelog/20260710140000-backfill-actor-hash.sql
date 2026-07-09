-- Backfill: hash existing cleartext actor_personal_code rows and drop the old column.
-- Idempotent: ADD COLUMN IF NOT EXISTS / DROP COLUMN IF EXISTS guards allow safe re-run.
-- Rollback: re-adds actor_personal_code as nullable TEXT (data is NOT restored — take a backup first).

-- Step 1: Ensure actor_personal_code_hash column exists (idempotent for DBs already migrated)
ALTER TABLE audit.audit_event
    ADD COLUMN IF NOT EXISTS actor_personal_code_hash BYTEA;

-- Step 2: Hash any remaining cleartext rows
UPDATE audit.audit_event
SET actor_personal_code_hash = digest(
    actor_personal_code || coalesce(current_setting('app.audit_salt', true), ''),
    'sha256'
)
WHERE actor_personal_code IS NOT NULL
  AND actor_personal_code <> ''
  AND actor_personal_code_hash IS NULL;

-- Step 3: Drop the cleartext column
ALTER TABLE audit.audit_event
    DROP COLUMN IF EXISTS actor_personal_code;

COMMENT ON COLUMN audit.audit_event.actor_personal_code_hash IS 'SHA-256 hash of the actor personal code salted with app.audit_salt DB parameter: digest(personal_code || current_setting(''app.audit_salt'', true), ''sha256''). Computed by RESQL insert_audit_event at write time. NULL if personal code is unknown. Cleartext personal codes are never stored.';
