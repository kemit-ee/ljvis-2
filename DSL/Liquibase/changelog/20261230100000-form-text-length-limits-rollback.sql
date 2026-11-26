-- Rollback: 20261230100000-form-text-length-limits (kutsutakse ainult .xml <rollback> kaudu).
DROP TRIGGER IF EXISTS trg_foreign_violation_form_text_limits ON forms.foreign_violation_form;
DROP TRIGGER IF EXISTS trg_compound_form_text_limits ON forms.compound_form;
DROP TRIGGER IF EXISTS trg_adr_form_text_limits ON forms.adr_form;
DROP TRIGGER IF EXISTS trg_kv_form_text_limits ON forms.kv_form;
DROP TRIGGER IF EXISTS trg_labour_inspection_form_text_limits ON forms.labour_inspection_form;
DROP TRIGGER IF EXISTS trg_sp_driver_form_text_limits ON forms.sp_driver_form;
DROP TRIGGER IF EXISTS trg_sp_teammate_form_text_limits ON forms.sp_teammate_form;
DROP TRIGGER IF EXISTS trg_tram_control_card_text_limits ON forms.tram_control_card;
DROP TRIGGER IF EXISTS trg_vehicle_technical_form_text_limits ON forms.vehicle_technical_form;
DROP TRIGGER IF EXISTS trg_trailer_technical_form_text_limits ON forms.trailer_technical_form;
DROP FUNCTION IF EXISTS forms.enforce_text_limits();
ALTER TABLE notifications.notification_template_mapping DROP CONSTRAINT IF EXISTS chk_ntm_text_length;
