-- liquibase formatted sql
-- changeset ljvis:20261207110100-rollback ignore:true

DELETE FROM classifier.classifier_value
WHERE classifier_key IN (
    SELECT classifier_key
    FROM classifier.classifier
    WHERE code = 'ROAD_OTHER'
)
  AND created_by = 'system:road-other-2026';
