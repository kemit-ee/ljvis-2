-- liquibase formatted sql
-- changeset ljvis:20260903100000 ignore:true

ALTER TABLE forms.foreign_violation_form
    DROP COLUMN IF EXISTS version;
