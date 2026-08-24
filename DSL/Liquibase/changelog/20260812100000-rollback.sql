-- liquibase formatted sql
-- changeset ljvis:20260812100000 ignore:true

-- NOTE: schema erru is NOT dropped here — it is shared with erru.ctud_request
-- (created by 20260801100000-initial-erru-ctud.sql), which must survive this rollback.
DROP TABLE IF EXISTS erru.cgr_request CASCADE;
DROP SEQUENCE IF EXISTS erru.seq_cgr_business_case_no;
DROP SEQUENCE IF EXISTS erru.seq_cgr_request_key;
-- Rollback for 20260812100000-audit-salt-rds-fix.
-- IMPORTANT: dropping these objects also breaks insert_audit_event.sql (ResQL).
-- Only roll back in a controlled maintenance window.

DROP FUNCTION IF EXISTS audit.hash_personal_code(TEXT);
DROP TABLE    IF EXISTS audit.config CASCADE;
