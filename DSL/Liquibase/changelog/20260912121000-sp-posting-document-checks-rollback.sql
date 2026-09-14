-- liquibase formatted sql
-- changeset ljvis:20260912121000-rollback ignore:true splitStatements:false
DELETE FROM classifier.classifier_value
 WHERE code IN ('LAHETUSDEKLARATSIOON_PRAEGUNE', 'LAHETUSDEKLARATSIOON_VARASEM')
   AND classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'OTHER_DOCUMENTS');
