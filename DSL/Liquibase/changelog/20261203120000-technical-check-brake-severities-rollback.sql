-- liquibase formatted sql
-- changeset ljvis:20261203120000-rollback ignore:true

UPDATE classifier.classifier_value
SET description = 'VO,OV,EOV'
WHERE code = 'CAA_1.1.7'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK');

UPDATE classifier.classifier_value
SET description = 'OV,EOV'
WHERE code = 'CAA_1.1.8'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK');
