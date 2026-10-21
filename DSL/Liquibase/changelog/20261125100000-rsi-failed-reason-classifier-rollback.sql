-- liquibase formatted sql
-- changeset ljvis:20261125100000-rollback ignore:true
--
-- Kustutatud RSI mustandeid ei taastata.

DELETE FROM classifier.classifier_value
WHERE classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'RSI_FAILED_REASON');
DELETE FROM classifier.classifier WHERE code = 'RSI_FAILED_REASON';
