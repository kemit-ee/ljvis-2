-- liquibase formatted sql
-- changeset ljvis:20261120100001-rollback ignore:true

DELETE FROM classifier.classifier_value
WHERE classifier_key = (
        SELECT classifier_key FROM classifier.classifier
        WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1
      )
  AND parent_key = (
        SELECT classifier_value_key FROM classifier.classifier_value
        WHERE code = 'CAA_10'
          AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1)
          AND parent_key IS NULL
      )
  AND code LIKE 'CAA_10.%';
