-- liquibase formatted sql
-- changeset ljvis:20261122120000-rollback ignore:true

ALTER TABLE forms.vehicle_technical_form
    DROP COLUMN IF EXISTS other_measure;

ALTER TABLE forms.trailer_technical_form
    DROP COLUMN IF EXISTS other_measure;
