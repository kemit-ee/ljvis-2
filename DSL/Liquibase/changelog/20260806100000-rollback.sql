-- liquibase formatted sql
-- changeset ljvis:20260806100000-rollback ignore:true
-- Rollback: restore original status CHECK constraints without 'deleted'.

ALTER TABLE forms.vehicle_technical_form DROP CONSTRAINT IF EXISTS chk_vtf_status;
ALTER TABLE forms.vehicle_technical_form ADD CONSTRAINT chk_vtf_status
  CHECK (status IN ('saved', 'confirmed', 'published'));

ALTER TABLE forms.trailer_technical_form DROP CONSTRAINT IF EXISTS chk_ttf_status;
ALTER TABLE forms.trailer_technical_form ADD CONSTRAINT chk_ttf_status
  CHECK (status IN ('saved', 'confirmed', 'published'));

ALTER TABLE forms.kv_form DROP CONSTRAINT IF EXISTS chk_kv_status;
ALTER TABLE forms.kv_form ADD CONSTRAINT chk_kv_status
  CHECK (status IN ('saved', 'confirmed', 'published'));

ALTER TABLE forms.adr_form DROP CONSTRAINT IF EXISTS chk_adr_status;
ALTER TABLE forms.adr_form ADD CONSTRAINT chk_adr_status
  CHECK (status IN ('saved', 'confirmed', 'published'));
