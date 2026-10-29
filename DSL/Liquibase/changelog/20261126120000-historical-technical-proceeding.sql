-- liquibase formatted sql
-- changeset ljvis:20261126120000 ignore:true splitStatements:false
-- Explicit owner P10 decision. This historical outcome does not claim the
-- vehicle was technically OK. Ordinary UI creation does not offer this option.
ALTER TABLE forms.vehicle_technical_form DROP CONSTRAINT chk_vtf_result_type;
ALTER TABLE forms.vehicle_technical_form ADD CONSTRAINT chk_vtf_result_type
 CHECK (result_type IN ('ok','extraordinary_inspection','extraordinary_inspection_ta','driving_ban','legacy_proceedings'));
