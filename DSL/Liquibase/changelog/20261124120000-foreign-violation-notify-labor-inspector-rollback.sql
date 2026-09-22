-- liquibase formatted sql
-- changeset ljvis:20261124120000-rollback ignore:true splitStatements:false
ALTER TABLE forms.foreign_violation_form
    DROP COLUMN IF EXISTS notify_labor_inspector;
