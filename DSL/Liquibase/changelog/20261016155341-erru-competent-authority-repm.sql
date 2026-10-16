-- liquibase formatted sql
-- changeset ljvis:20261016155341 ignore:true
-- REPM lisatakse ERRU pädevate asutuste valikusse. Vormipiirangut ei lisata.
INSERT INTO classifier.classifier_value (
    classifier_value_key, classifier_key, code, name, valid_from, created_by
)
SELECT nextval('classifier.seq_classifier_value_key'), c.classifier_key,
       'EE-REPM', 'Regionaal- ja Põllumajandusministeerium', CURRENT_DATE, 'ljvis2'
FROM (
    SELECT classifier_key FROM classifier.classifier
    WHERE code = 'COMPETENT_AUTHORITY'
    ORDER BY created_at DESC LIMIT 1
) c
WHERE NOT EXISTS (
    SELECT 1 FROM classifier.classifier_value cv
    WHERE cv.classifier_key = c.classifier_key AND cv.code = 'EE-REPM'
);
