DELETE FROM classifier.classifier_value WHERE code = 'CAA_20' AND parent_key IS NULL
AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);
UPDATE classifier.classifier_value SET name = 'muu' WHERE code = 'CAA_10' AND parent_key IS NULL;
UPDATE classifier.classifier_value SET valid_until = NULL WHERE code = 'CAA_11' AND parent_key IS NULL;
