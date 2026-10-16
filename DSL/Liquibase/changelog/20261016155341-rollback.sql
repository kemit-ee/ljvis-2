-- liquibase formatted sql
-- changeset ljvis:20261016155341-rollback
DELETE FROM classifier.classifier_value
WHERE code = 'EE-REPM'
  AND created_by = 'ljvis2'
  AND classifier_key IN (
      SELECT classifier_key FROM classifier.classifier WHERE code = 'COMPETENT_AUTHORITY'
  );
