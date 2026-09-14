-- liquibase formatted sql
-- changeset ljvis:20261120110000
--
-- COUNTRY klassifikaatorile lisatakse 'XX' = 'Määramata'. Rahvastikuregistri
-- (RR) isikupäring võib tagastada kodakondsuse koodina/nimena "XX", kui
-- isiku kodakondsus on määramata (kodakondsuseta). 'XX' on ISO 3166-1
-- kasutajale-reserveeritud koodivahemikust (AA, QM-QZ, XA-XZ, ZZ), ei lähe
-- vastuollu ühegi tegeliku riigikoodiga. Vt frontend/src/features/xroad/
-- isoNumericCountryCodes.ts (RR numbrilise koodi -> COUNTRY alpha-2 teisendus).
-- Idempotentne.

INSERT INTO classifier.classifier_value (
    classifier_value_key, classifier_key, code, name, valid_from, created_by
)
SELECT nextval('classifier.seq_classifier_value_key'), classifier_key, 'XX', 'Määramata', CURRENT_DATE, 'system'
FROM classifier.classifier
WHERE code = 'COUNTRY'
  AND NOT EXISTS (
    SELECT 1 FROM classifier.classifier_value cv
    WHERE cv.classifier_key = classifier.classifier_key AND cv.code = 'XX'
  );
