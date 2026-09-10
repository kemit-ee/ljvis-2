-- liquibase formatted sql
-- changeset ljvis:20260909223000-rollback ignore:true

DELETE FROM classifier.classifier_value
 WHERE code = 'NO'
   AND classifier_key IN (
       SELECT classifier_key
         FROM classifier.classifier
        WHERE code = 'ERRU_MEMBER'
   );
