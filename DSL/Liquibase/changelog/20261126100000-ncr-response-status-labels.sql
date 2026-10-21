-- liquibase formatted sql
-- changeset ljvis:20261126100000 splitStatements:false
--
-- NCR vastuse staatuse kood (NCR_RESPONSE_STATUS): valikute nimed "Leitud" ja "Ei leitud".
--   OK       -> "Leitud"      (kood jääb samaks, ERRU XSD ncrResponseStatusCodeType)
--   NotFound -> "Ei leitud"   (kood jääb samaks)
-- Idempotentne.

UPDATE classifier.classifier_value
SET name = 'Leitud'
WHERE code = 'OK'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'NCR_RESPONSE_STATUS');

UPDATE classifier.classifier_value
SET name = 'Ei leitud'
WHERE code = 'NotFound'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'NCR_RESPONSE_STATUS');
