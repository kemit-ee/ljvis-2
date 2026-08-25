-- liquibase formatted sql
-- changeset ljvis:20260825100000 ignore:true
-- Add 'published' to status CHECK constraints for  sub-form table that were
-- missing it.

-- good_repute_form
ALTER TABLE forms.good_repute_form DROP CONSTRAINT IF EXISTS chk_grf_status;
ALTER TABLE forms.good_repute_form ADD CONSTRAINT chk_grf_status
  CHECK (status IN ('saved', 'confirmed', 'published', 'deleted'));

