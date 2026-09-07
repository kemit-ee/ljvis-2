-- liquibase formatted sql
-- changeset ljvis:20261101120000-rollback splitStatements:false
ALTER TABLE forms.foreign_violation_form
    DROP COLUMN IF EXISTS erru_ncr_message_key;
