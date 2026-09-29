-- liquibase formatted sql
-- changeset ljvis:20261126100000-rollback ignore:true

UPDATE classifier.classifier_value SET name = 'Transport undertaking leitud'
WHERE code = 'OK' AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'NCR_RESPONSE_STATUS');
UPDATE classifier.classifier_value SET name = 'Transport undertakingut ei leitud'
WHERE code = 'NotFound' AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'NCR_RESPONSE_STATUS');
