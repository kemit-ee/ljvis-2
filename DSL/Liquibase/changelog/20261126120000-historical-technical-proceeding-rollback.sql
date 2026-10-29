-- liquibase formatted sql
-- changeset ljvis:20261126120000-rollback ignore:true splitStatements:false
LOCK TABLE forms.vehicle_technical_form IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM forms.vehicle_technical_form WHERE result_type='legacy_proceedings') THEN
  RAISE EXCEPTION 'Rollback refused: historical proceedings exist. Restore the pre-migration backup; do not replace them with ok.';
 END IF;
END $$;
ALTER TABLE forms.vehicle_technical_form DROP CONSTRAINT chk_vtf_result_type;
ALTER TABLE forms.vehicle_technical_form ADD CONSTRAINT chk_vtf_result_type
 CHECK (result_type IN ('ok','extraordinary_inspection','extraordinary_inspection_ta','driving_ban'));
