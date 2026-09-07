-- liquibase formatted sql
-- changeset ljvis:20260907150000-rollback ignore:true splitStatements:false
--
-- Rollback 20260907150000: eemaldab forms.adr_form.infringement_notes_summary veeru.

ALTER TABLE forms.adr_form
    DROP COLUMN IF EXISTS infringement_notes_summary;
