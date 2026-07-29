-- liquibase formatted sql
-- changeset ljvis:20260728140000-rollback ignore:true

DELETE FROM classifier.classifier_value
WHERE classifier_key IN (
    SELECT classifier_key FROM classifier.classifier WHERE code IN ('DRIVING_VIOLATION', 'TRANSPORT_TYPE')
);
DELETE FROM classifier.classifier WHERE code IN ('DRIVING_VIOLATION', 'TRANSPORT_TYPE');
