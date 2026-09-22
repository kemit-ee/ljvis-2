-- liquibase formatted sql
-- changeset ljvis:20261124130000-rollback ignore:true splitStatements:false
DROP VIEW IF EXISTS tableau.foreign_violation_result;
DROP INDEX IF EXISTS forms.idx_foreign_violation_form_violations_gin;
