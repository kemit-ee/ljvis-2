-- liquibase formatted sql
-- changeset ljvis:20260826100000 ignore:true splitStatements:false

ALTER TABLE forms.trailer_technical_form
    ADD COLUMN trailer_reg_nr             VARCHAR(100);

COMMENT ON COLUMN forms.trailer_technical_form.trailer_reg_nr IS 'Trailer registration number';

