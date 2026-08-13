-- liquibase formatted sql
-- changeset ljvis:20260812100000 ignore:true
-- Rollback for 20260812100000-audit-salt-rds-fix.
-- IMPORTANT: dropping these objects also breaks insert_audit_event.sql (ResQL).
-- Only roll back in a controlled maintenance window.

DROP FUNCTION IF EXISTS audit.hash_personal_code(TEXT);
DROP TABLE    IF EXISTS audit.config CASCADE;
