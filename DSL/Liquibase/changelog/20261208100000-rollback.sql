-- liquibase formatted sql
-- changeset ljvis:20261208100000-rollback ignore:true

DROP INDEX IF EXISTS forms.uq_form_attachment_deleted_s3_key;

DROP TRIGGER IF EXISTS trg_compound_form_revision ON forms.compound_form;
DROP FUNCTION IF EXISTS forms.set_compound_form_revision();
DROP INDEX IF EXISTS forms.uq_compound_form_key_revision;
ALTER TABLE forms.compound_form DROP COLUMN IF EXISTS revision;

DROP TRIGGER IF EXISTS trg_tram_control_card_revision ON forms.tram_control_card;
DROP FUNCTION IF EXISTS forms.set_tram_control_card_revision();
DROP INDEX IF EXISTS forms.uq_tram_control_card_key_revision;
ALTER TABLE forms.tram_control_card DROP COLUMN IF EXISTS revision;

DROP TRIGGER IF EXISTS trg_sp_driver_form_revision ON forms.sp_driver_form;
DROP FUNCTION IF EXISTS forms.set_sp_driver_form_revision();
DROP INDEX IF EXISTS forms.uq_sp_driver_form_key_revision;
ALTER TABLE forms.sp_driver_form DROP COLUMN IF EXISTS revision;

DROP TRIGGER IF EXISTS trg_sp_teammate_form_revision ON forms.sp_teammate_form;
DROP FUNCTION IF EXISTS forms.set_sp_teammate_form_revision();
DROP INDEX IF EXISTS forms.uq_sp_teammate_form_key_revision;
ALTER TABLE forms.sp_teammate_form DROP COLUMN IF EXISTS revision;

DROP TRIGGER IF EXISTS trg_vehicle_technical_form_revision ON forms.vehicle_technical_form;
DROP FUNCTION IF EXISTS forms.set_vehicle_technical_form_revision();
DROP INDEX IF EXISTS forms.uq_vehicle_technical_form_key_revision;
ALTER TABLE forms.vehicle_technical_form DROP COLUMN IF EXISTS revision;

DROP TRIGGER IF EXISTS trg_trailer_technical_form_revision ON forms.trailer_technical_form;
DROP FUNCTION IF EXISTS forms.set_trailer_technical_form_revision();
DROP INDEX IF EXISTS forms.uq_trailer_technical_form_key_revision;
ALTER TABLE forms.trailer_technical_form DROP COLUMN IF EXISTS revision;

DROP TRIGGER IF EXISTS trg_adr_form_revision ON forms.adr_form;
DROP FUNCTION IF EXISTS forms.set_adr_form_revision();
DROP INDEX IF EXISTS forms.uq_adr_form_key_revision;
ALTER TABLE forms.adr_form DROP COLUMN IF EXISTS revision;

DROP TRIGGER IF EXISTS trg_kv_form_revision ON forms.kv_form;
DROP FUNCTION IF EXISTS forms.set_kv_form_revision();
DROP INDEX IF EXISTS forms.uq_kv_form_key_revision;
ALTER TABLE forms.kv_form DROP COLUMN IF EXISTS revision;

DROP TRIGGER IF EXISTS trg_foreign_violation_form_revision ON forms.foreign_violation_form;
DROP FUNCTION IF EXISTS forms.set_foreign_violation_form_revision();
DROP INDEX IF EXISTS forms.uq_foreign_violation_form_key_revision;
ALTER TABLE forms.foreign_violation_form DROP COLUMN IF EXISTS revision;

DROP TRIGGER IF EXISTS trg_labour_inspection_form_revision ON forms.labour_inspection_form;
DROP FUNCTION IF EXISTS forms.set_labour_inspection_form_revision();
DROP INDEX IF EXISTS forms.uq_labour_inspection_form_key_revision;
ALTER TABLE forms.labour_inspection_form DROP COLUMN IF EXISTS revision;

DROP TRIGGER IF EXISTS trg_good_repute_form_revision ON forms.good_repute_form;
DROP FUNCTION IF EXISTS forms.set_good_repute_form_revision();
DROP INDEX IF EXISTS forms.uq_good_repute_form_key_revision;
ALTER TABLE forms.good_repute_form DROP COLUMN IF EXISTS revision;
