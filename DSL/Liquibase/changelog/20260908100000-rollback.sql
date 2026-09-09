-- liquibase formatted sql
-- changeset ljvis:20260908100000 ignore:true

ALTER TABLE forms.compound_form
    DROP COLUMN IF EXISTS version;
