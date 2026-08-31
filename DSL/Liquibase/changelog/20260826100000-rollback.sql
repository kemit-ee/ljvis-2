-- liquibase formatted sql
-- changeset ljvis:20260826100000 ignore:true

ALTER TABLE forms.trailer_technical_check
    DROP COLUMN IF EXISTS trailer_reg_nr;
