-- liquibase formatted sql
-- changeset ljvis:20261203130000 ignore:true
-- Tehnokaardi pidurisüsteemi ja rooliseadme punktide lubatud raskusastmed (description) parandus:
--   1.1.15 Piduritrossid, -vardad, -hoovastik     -> OV,EOV (VO eemaldatud)
--   1.1.17 Pidurdusjõu regulaator                 -> VO,OV,EOV
--   1.1.20 Haagisepidurite automaatne rakendumine -> OV
--   1.4.1  Seisupiduri toimimine                  -> OV
--   1.4.2  Seisupiduri tõhusus                    -> OV
--   2.1.1  Roolimehhanismi seisund                -> VO,OV,EOV
--   2.2.2  Roolisammas/roolikann ja hoovad        -> OV,EOV
--   2.3    Rooliratta vabakäik                    -> OV,EOV
--   2.5    Haagise esitelje pöördering            -> OV,EOV
--   2.6    Elektrooniline roolivõimendi (EPS)     -> OV
--   3.6    Tuuleklaasi soojendi                   -> VO,OV
--   4.1.2  Lähitulelaternate reguleeritus        -> OV
--   4.2.2  Ääretulelaternad — lülitamine         -> VO,OV
--   4.4.2  Suuna- ja ohutulelaternad — lülitamine -> VO,OV
--   4.5.3  Udutulelaternad — lülitamine          -> VO,OV
--   4.5.4  Udutulelaternad — vastavus nõuetele    -> OV
--   4.7.2  Tagumise reg. märgi tule latern        -> VO,OV
--   4.10   Veduki ja haagise ühendusjuhtmed      -> VO,OV (EOV kustutatud)
--   4.14.2 Päevatulelaternad — vastavus nõuetele  -> OV
--   5.3.1  Vedrud ja stabilisaator                -> VO,OV,EOV
--   6.1.4  Kaitserauad, allasõidutõkked          -> OV,EOV
-- Lisa 2-s punkti 2.4 pole. Migratsioon 20261120100000 nihutas koodid (CAA_2.4 -> CAA_2.5,
-- CAA_2.5 -> CAA_2.6), kuid jättis nimedesse vanad numbrid ("2.4 Haagise...", "2.5 Elektrooniline...");
-- siin parandatakse ka nimed.
-- Seeme 20261020110000 oli need valesti (VO,OV,EOV; OV,EOV; EOV; OV,EOV; OV,EOV; OV,EOV; OV; OV,EOV; OV,EOV; OV).
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

UPDATE classifier.classifier_value
SET description = 'OV'
WHERE code = 'CAA_1.4.1'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK');

UPDATE classifier.classifier_value
SET description = 'OV'
WHERE code = 'CAA_1.4.2'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK');

UPDATE classifier.classifier_value
SET description = 'VO,OV,EOV'
WHERE code = 'CAA_2.1.1'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK');

UPDATE classifier.classifier_value
SET description = 'OV,EOV'
WHERE code = 'CAA_2.2.2'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK');

UPDATE classifier.classifier_value
SET description = 'OV,EOV'
WHERE code = 'CAA_2.3'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK');

UPDATE classifier.classifier_value
SET name = '2.5 Haagise esitelje pöördering', description = 'OV,EOV'
WHERE code = 'CAA_2.5'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK');

UPDATE classifier.classifier_value
SET name = '2.6 Elektrooniline roolivõimendi (Electronic Power Steering, EPS)', description = 'OV'
WHERE code = 'CAA_2.6'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK');

UPDATE classifier.classifier_value
SET description = 'VO,OV'
WHERE code = 'CAA_3.6'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK');

UPDATE classifier.classifier_value
SET description = 'OV'
WHERE code = 'CAA_4.1.2'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK');

UPDATE classifier.classifier_value
SET description = 'VO,OV'
WHERE code = 'CAA_4.2.2'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK');

UPDATE classifier.classifier_value
SET description = 'VO,OV'
WHERE code = 'CAA_4.4.2'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK');

UPDATE classifier.classifier_value
SET description = 'VO,OV'
WHERE code = 'CAA_4.5.3'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK');

UPDATE classifier.classifier_value
SET description = 'OV'
WHERE code = 'CAA_4.5.4'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK');

UPDATE classifier.classifier_value
SET description = 'VO,OV'
WHERE code = 'CAA_4.7.2'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK');

UPDATE classifier.classifier_value
SET description = 'VO,OV'
WHERE code = 'CAA_4.10'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK');

UPDATE classifier.classifier_value
SET description = 'OV'
WHERE code = 'CAA_4.14.2'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK');

UPDATE classifier.classifier_value
SET description = 'VO,OV,EOV'
WHERE code = 'CAA_5.3.1'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK');

UPDATE classifier.classifier_value
SET description = 'OV,EOV'
WHERE code = 'CAA_6.1.4'
  AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK');
