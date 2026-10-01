-- liquibase formatted sql
-- changeset ljvis:20261206100000 ignore:true
-- Tehnokaardi punktide 7.9, 7.11, 8.x ja 9.x lubatud raskusastmed (description) parandus.
--   7.9 OV | 7.11 OV | 8.1.1 OV,EOV | 8.2.1.2 OV | 8.2.2.1 OV | 8.2.2.2 OV
--   8.4.1 OV,EOV | 8.4.2 OV,EOV | 9.2 OV,EOV | 9.3 OV,EOV
-- Punkt 8.4.2 "Vedelikulekked" jäetakse alles ühe reana: topeltread (sama kood) kustutatakse,
-- alles jääb vanim. Vormid viitavad rikkele koodi, mitte rea võtmega.
-- Idempotentne: UPDATE seab sama väärtuse uuesti, DELETE ei leia teist korda midagi.

DELETE FROM classifier.classifier_value
WHERE code = 'CAA_8.4.2'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1)
  AND classifier_value_key NOT IN (
    SELECT MIN(classifier_value_key) FROM classifier.classifier_value
    WHERE code = 'CAA_8.4.2' AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1)
  );

UPDATE classifier.classifier_value
SET description = 'OV'
WHERE code = 'CAA_7.9'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

UPDATE classifier.classifier_value
SET description = 'OV'
WHERE code = 'CAA_7.11'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

UPDATE classifier.classifier_value
SET description = 'OV,EOV'
WHERE code = 'CAA_8.1.1'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

UPDATE classifier.classifier_value
SET description = 'OV'
WHERE code = 'CAA_8.2.1.2'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

UPDATE classifier.classifier_value
SET description = 'OV'
WHERE code = 'CAA_8.2.2.1'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

UPDATE classifier.classifier_value
SET description = 'OV'
WHERE code = 'CAA_8.2.2.2'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

UPDATE classifier.classifier_value
SET description = 'OV,EOV'
WHERE code = 'CAA_8.4.1'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

UPDATE classifier.classifier_value
SET description = 'OV,EOV'
WHERE code = 'CAA_8.4.2'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

UPDATE classifier.classifier_value
SET description = 'OV,EOV'
WHERE code = 'CAA_9.2'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

UPDATE classifier.classifier_value
SET description = 'OV,EOV'
WHERE code = 'CAA_9.3'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);
