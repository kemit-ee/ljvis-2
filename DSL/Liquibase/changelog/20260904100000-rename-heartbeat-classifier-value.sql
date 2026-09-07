-- liquibase formatted sql
-- changeset ljvis:20260904100000 splitStatements:false
--
-- Nimeta CTUD_REQUEST_PURPOSE klassifikaatori väärtus 'Heartbeat' ümber:
-- 'Elumärk' → 'Toimimine'. Kood (Heartbeat) ja muud väljad jäävad muutmata.

UPDATE classifier.classifier_value cv
SET    name = 'Toimimine'
FROM   classifier.classifier c
WHERE  c.classifier_key = cv.classifier_key
  AND  cv.code           = 'Heartbeat'
  AND  cv.name           = 'Elumärk';
