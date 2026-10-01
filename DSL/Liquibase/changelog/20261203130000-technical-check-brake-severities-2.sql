-- liquibase formatted sql
-- changeset ljvis:20261203130000 ignore:true
-- Tehnokaardi pidurisüsteemi punktide lubatud raskusastmed (description) parandus:
--   1.1.15 Piduritrossid, -vardad, -hoovastik     -> OV,EOV (VO eemaldatud)
--   1.1.17 Pidurdusjõu regulaator                 -> VO,OV,EOV
--   1.1.20 Haagisepidurite automaatne rakendumine -> OV
-- Seeme 20261020110000 oli need valesti (VO,OV,EOV; OV,EOV; EOV).
-- Idempotentne: UPDATE seab sama väärtuse uuesti.

UPDATE classifier.classifier_value
SET description = 'OV,EOV'
WHERE code = 'CAA_1.1.15'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK');

UPDATE classifier.classifier_value
SET description = 'VO,OV,EOV'
WHERE code = 'CAA_1.1.17'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK');

UPDATE classifier.classifier_value
SET description = 'OV'
WHERE code = 'CAA_1.1.20'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK');
