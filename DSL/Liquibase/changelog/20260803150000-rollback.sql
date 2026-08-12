-- liquibase formatted sql
-- changeset ljvis:20260803150000 ignore:true

DELETE FROM classifier.classifier_value WHERE classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK');
DELETE FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK';
DROP TABLE IF EXISTS forms.vehicle_technical_form CASCADE;
DROP TABLE IF EXISTS forms.trailer_technical_form CASCADE;
DROP SEQUENCE IF EXISTS forms.seq_vehicle_technical_form_key;
DROP SEQUENCE IF EXISTS forms.seq_trailer_technical_form_key;
