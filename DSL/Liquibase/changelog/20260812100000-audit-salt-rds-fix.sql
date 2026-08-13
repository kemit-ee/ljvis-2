-- liquibase formatted sql
-- changeset ljvis:20260812100000 ignore:true
-- Patch: create audit.config and audit.hash_personal_code() for environments where
-- 20260605100000-initial-audit ran before these objects were part of that changeset.
-- Idempotent: CREATE TABLE IF NOT EXISTS + ON CONFLICT DO UPDATE + CREATE OR REPLACE FUNCTION.
-- On RDS (where 20260605100000 creates these objects): this changeset is a safe no-op.
-- On local dev (where 20260605100000 ran the old version without these objects): this creates them.

CREATE TABLE IF NOT EXISTS audit.config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

COMMENT ON TABLE  audit.config IS 'Key-value configuration for the audit schema. Currently holds ''audit_salt'' used by audit.hash_personal_code(). NOT a general application settings table — keep it minimal.';
COMMENT ON COLUMN audit.config.key   IS 'Configuration key (e.g. ''audit_salt'').';
COMMENT ON COLUMN audit.config.value IS 'Configuration value. NOT NULL — absence of a required key is a deployment error, not a runtime default.';

INSERT INTO audit.config (key, value)
    VALUES ('audit_salt', '${AUDIT_SALT}')
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

CREATE OR REPLACE FUNCTION audit.hash_personal_code(code TEXT) RETURNS BYTEA
LANGUAGE sql STABLE AS $$
    SELECT CASE WHEN code IS NULL OR code = ''
                THEN NULL
                ELSE digest(code || (SELECT value FROM audit.config WHERE key = 'audit_salt'), 'sha256')
           END
$$;

COMMENT ON FUNCTION audit.hash_personal_code(TEXT) IS 'Returns sha256(code || audit_salt) as BYTEA, or NULL when code is NULL or empty. Reads the salt from audit.config. Single authoritative implementation — always call this instead of inlining digest() with current_setting().';
