-- liquibase formatted sql
-- changeset ljvis:20261206100000-rollback ignore:true
-- Topeltrida (8.4.2) ei taastata.

UPDATE classifier.classifier_value
SET description = 'VO,OV'
WHERE code = 'CAA_7.9'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

UPDATE classifier.classifier_value
SET description = 'VO'
WHERE code = 'CAA_7.11'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

UPDATE classifier.classifier_value
SET description = 'VO,OV'
WHERE code = 'CAA_8.1.1'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

UPDATE classifier.classifier_value
SET description = 'VO,OV'
WHERE code = 'CAA_8.2.1.2'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

UPDATE classifier.classifier_value
SET description = 'VO,OV'
WHERE code = 'CAA_8.2.2.1'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

UPDATE classifier.classifier_value
SET description = 'VO,OV'
WHERE code = 'CAA_8.2.2.2'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

UPDATE classifier.classifier_value
SET description = 'VO,OV'
WHERE code = 'CAA_8.4.1'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

UPDATE classifier.classifier_value
SET description = 'OV'
WHERE code = 'CAA_8.4.2'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

UPDATE classifier.classifier_value
SET description = 'VO,OV,EOV'
WHERE code = 'CAA_9.2'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

UPDATE classifier.classifier_value
SET description = 'VO,OV,EOV'
WHERE code = 'CAA_9.3'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);
