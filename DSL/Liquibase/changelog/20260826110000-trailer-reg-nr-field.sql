-- liquibase formatted sql
-- changeset ljvis:20260826110000 ignore:true splitStatements:false

ALTER TABLE forms.trailer_technical_form
    ADD COLUMN IF NOT EXISTS trailer_reg_nr VARCHAR(100);

COMMENT ON COLUMN forms.trailer_technical_form.trailer_reg_nr IS 'Trailer registration number';

