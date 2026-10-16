-- liquibase formatted sql
-- changeset ljvis:20261016211000-rollback ignore:true
DROP FUNCTION IF EXISTS risk.additional_controls(TEXT, DATE, DATE);
