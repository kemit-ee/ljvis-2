-- liquibase formatted sql
-- changeset ljvis:20260902100000 ignore:true

ALTER TABLE forms.sp_driver_form
    DROP COLUMN IF EXISTS version;

ALTER TABLE forms.sp_teammate_form
    DROP COLUMN IF EXISTS version;
