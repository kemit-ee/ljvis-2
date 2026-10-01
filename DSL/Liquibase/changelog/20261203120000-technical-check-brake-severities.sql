-- liquibase formatted sql
-- changeset ljvis:20261203120000 ignore:true
-- Tehnokaardi pidurisüsteemi punktide lubatud raskusastmed (description) parandus:
--   1.1.7 Piduriklapid/ventiilid                  -> VO,OV
--   1.1.8 Haagisepidurite ühendused               -> VO,OV,EOV
-- Seeme 20261020110000 oli need valesti (1.1.7 VO,OV,EOV; 1.1.8 OV,EOV).
-- Idempotentne: UPDATE seab sama väärtuse uuesti.

UPDATE classifier.classifier_value
SET description = 'VO,OV'
WHERE code = 'CAA_1.1.7'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK');

UPDATE classifier.classifier_value
SET description = 'VO,OV,EOV'
WHERE code = 'CAA_1.1.8'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK');
