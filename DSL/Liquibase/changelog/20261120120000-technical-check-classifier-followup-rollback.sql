-- liquibase formatted sql
-- changeset ljvis:20261120120000-rollback ignore:true

INSERT INTO classifier.classifier_value (
    classifier_value_key, classifier_key, code, name, valid_from, valid_until, created_by
)
SELECT nextval('classifier.seq_classifier_value_key'), classifier_key, 'CAA_20', 'kinnitusmeetodid', CURRENT_DATE, NULL, 'system'
FROM classifier.classifier
WHERE code = 'TECHNICAL_CHECK'
  AND NOT EXISTS (
    SELECT 1 FROM classifier.classifier_value cv
    WHERE cv.classifier_key = classifier.classifier_key AND cv.code = 'CAA_20' AND cv.parent_key IS NULL
  );

DELETE FROM classifier.classifier_value
WHERE code = 'CAA_11.1'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);
