-- liquibase formatted sql
-- changeset ljvis:20260904100000-rollback ignore:true

UPDATE classifier.classifier_value cv
SET    name = 'Elumärk'
FROM   classifier.classifier c
WHERE  c.classifier_key = cv.classifier_key
  AND  cv.code           = 'Heartbeat'
  AND  cv.name           = 'Toimimine';
