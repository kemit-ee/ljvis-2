-- liquibase formatted sql
-- changeset ljvis:20261120120000
--
-- Kaks järelparandust 20261120100000/20261120100001 juurde (kasutaja leidis
-- rakendusest: "muu" näitab "sellel osal ei ole rikkeid" ja "kinnitusmeetodid"
-- on endiselt näha):
--
-- 1) CAA_11 ("muu") jäi ilma level-2 rikketa. Lisa 2 annab sellele täpselt
--    ühe rea: "11.1 Muu tehniline viga". Lisatud.
--
-- 2) CAA_20 ("kinnitusmeetodid", fabritseeritud RSI-teate järgi tehtud grupp,
--    vt 20261120100000 kommentaar) — varasem parandus aegustas selle
--    `valid_until = CURRENT_DATE + 1` kaudu, mis kehtib alles JÄRGMISEST
--    päevast (`is_valid = valid_until IS NULL OR valid_until > CURRENT_DATE`,
--    vt DSL/Resql/ljvis/POST/classifier/get_classifier_values.sql) — sama
--    päeva jooksul, mil parandus rakendus, jäi grupp endiselt nähtavaks.
--    Kuna CAA_20-l ei ole (ega ole kunagi olnud) ühtki level-2 rikkerida,
--    kustutatakse see rida nüüd täielikult, mitte ei üritata aegumiskuupäeva
--    uuesti paika sättida.
--
-- Idempotentne.

INSERT INTO classifier.classifier_value (
    classifier_value_key, classifier_key, code, name, description,
    parent_key, valid_from, valid_until, created_by
)
SELECT
    nextval('classifier.seq_classifier_value_key'),
    parent.classifier_key,
    'CAA_11.1',
    '11.1 Muu tehniline viga',
    'VO,OV,EOV',
    parent.classifier_value_key,
    CURRENT_DATE,
    NULL,
    'system'
FROM classifier.classifier_value parent
WHERE parent.code = 'CAA_11'
  AND parent.classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1)
  AND parent.parent_key IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM classifier.classifier_value existing
    WHERE existing.code = 'CAA_11.1'
      AND existing.classifier_key = parent.classifier_key
  );

DELETE FROM classifier.classifier_value
WHERE code = 'CAA_20'
  AND parent_key IS NULL
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);
