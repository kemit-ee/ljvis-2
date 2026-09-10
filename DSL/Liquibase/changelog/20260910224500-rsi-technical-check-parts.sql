-- liquibase formatted sql
-- changeset ljvis:20260910224500
UPDATE classifier.classifier_value SET name = 'sõiduki sobivus'
WHERE code = 'CAA_10' AND parent_key IS NULL
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);
-- valid_until is exclusive and must be later than valid_from (ck_cv_period).
UPDATE classifier.classifier_value SET valid_until = CURRENT_DATE + 1
WHERE code = 'CAA_11' AND parent_key IS NULL
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);
INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, created_by)
SELECT nextval('classifier.seq_classifier_value_key'), classifier_key, 'CAA_20', 'kinnitusmeetodid', CURRENT_DATE, 'system'
FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK'
AND NOT EXISTS (SELECT 1 FROM classifier.classifier_value cv WHERE cv.classifier_key = classifier.classifier_key AND cv.code = 'CAA_20');
