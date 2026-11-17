-- liquibase formatted sql
-- changeset ljvis:20261228100000-rollback ignore:true splitStatements:false

ALTER TABLE forms.sp_teammate_form DROP CONSTRAINT IF EXISTS ex_sp_teammate_form_number_key;
ALTER TABLE forms.sp_driver_form DROP CONSTRAINT IF EXISTS ex_sp_driver_form_number_key;
ALTER TABLE forms.trailer_technical_form DROP CONSTRAINT IF EXISTS ex_trailer_technical_form_number_key;
ALTER TABLE forms.vehicle_technical_form DROP CONSTRAINT IF EXISTS ex_vehicle_technical_form_number_key;
DROP SEQUENCE IF EXISTS forms.seq_sp_form_number;
DROP SEQUENCE IF EXISTS forms.seq_th_form_number;
