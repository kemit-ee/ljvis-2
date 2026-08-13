-- liquibase formatted sql
-- changeset ljvis:20260806110000 ignore:true
-- Add 'deleted' to status CHECK constraints for 4 sub-form tables that were
-- missing it. Required by the new delete functionality (LJVIS2-72, LJVIS2-74,
-- LJVIS2-141).

-- vehicle_technical_form
ALTER TABLE forms.vehicle_technical_form DROP CONSTRAINT IF EXISTS chk_vtf_status;
ALTER TABLE forms.vehicle_technical_form ADD CONSTRAINT chk_vtf_status
  CHECK (status IN ('saved', 'confirmed', 'published', 'deleted'));

-- trailer_technical_form
ALTER TABLE forms.trailer_technical_form DROP CONSTRAINT IF EXISTS chk_ttf_status;
ALTER TABLE forms.trailer_technical_form ADD CONSTRAINT chk_ttf_status
  CHECK (status IN ('saved', 'confirmed', 'published', 'deleted'));

-- kv_form (transport-interruption)
ALTER TABLE forms.kv_form DROP CONSTRAINT IF EXISTS chk_kv_status;
ALTER TABLE forms.kv_form ADD CONSTRAINT chk_kv_status
  CHECK (status IN ('saved', 'confirmed', 'published', 'deleted'));

-- adr_form
ALTER TABLE forms.adr_form DROP CONSTRAINT IF EXISTS chk_adr_status;
ALTER TABLE forms.adr_form ADD CONSTRAINT chk_adr_status
  CHECK (status IN ('saved', 'confirmed', 'published', 'deleted'));

-- good_repute_form
ALTER TABLE forms.labour_inspection_form
DROP CONSTRAINT chk_lif_status;

ALTER TABLE forms.labour_inspection_form
    ADD CONSTRAINT chk_lif_status CHECK (status IN ('saved', 'confirmed', 'published', 'deleted'));

