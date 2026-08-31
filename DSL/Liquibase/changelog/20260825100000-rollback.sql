-- liquibase formatted sql
-- changeset ljvis:20260825100000-rollback ignore:true
-- Rollback: restore original status CHECK constraints without 'published'.

ALTER TABLE forms.good_repute_form DROP CONSTRAINT IF EXISTS chk_grf_status;
ALTER TABLE forms.good_repute_form ADD CONSTRAINT chk_grf_status
  CHECK (status IN ('saved', 'confirmed', 'deleted'));
