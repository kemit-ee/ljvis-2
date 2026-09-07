-- liquibase formatted sql
-- changeset ljvis:20261101100000-rollback splitStatements:false
ALTER TABLE forms.foreign_violation_form
    DROP COLUMN IF EXISTS additional_sanction_codes;
