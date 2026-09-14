-- liquibase formatted sql
-- changeset ljvis:20261120110000-rollback ignore:true

DELETE FROM classifier.classifier_value
WHERE code = 'XX'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'COUNTRY' ORDER BY created_at DESC LIMIT 1);
