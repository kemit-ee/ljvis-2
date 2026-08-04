-- liquibase formatted sql
-- changeset ljvis:20260804120000 ignore:true

DELETE FROM classifier.classifier_value WHERE classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'INTERRUPTION_BASES');
DELETE FROM classifier.classifier WHERE code = 'INTERRUPTION_BASES';
DROP TABLE IF EXISTS forms.kv_form CASCADE;
DROP SEQUENCE IF EXISTS forms.seq_kv_form_key;
