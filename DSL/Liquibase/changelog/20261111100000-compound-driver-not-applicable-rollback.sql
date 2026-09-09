-- liquibase formatted sql
-- changeset ljvis:20261111100000-rollback ignore:true splitStatements:false
--
-- Rollback 20261111100000: eemaldab forms.compound_form.driver_not_applicable veeru.

ALTER TABLE forms.compound_form
    DROP COLUMN IF EXISTS driver_not_applicable;
