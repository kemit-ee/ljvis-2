-- liquibase formatted sql
-- changeset ljvis:20261022110000-rollback ignore:true splitStatements:false
-- Rollback: 20261022110000-form-type-tram-kontrollkaart (kutsutakse ainult .xml <rollback> kaudu).

DELETE FROM classifier.classifier_value cv
USING classifier.classifier c
WHERE cv.classifier_key = c.classifier_key
  AND c.code            = 'FORM_TYPE'
  AND cv.code           = 'TRAM_KONTROLLKAART';
