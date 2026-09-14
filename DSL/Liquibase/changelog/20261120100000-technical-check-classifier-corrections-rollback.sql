-- liquibase formatted sql
-- changeset ljvis:20261120100000-rollback ignore:true

-- CAA_20 taasaktiveerimine
UPDATE classifier.classifier_value
SET valid_until = NULL
WHERE code = 'CAA_20'
  AND parent_key IS NULL
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

-- CAA_11 aegumine taastamine (nagu 20260910224500 algselt tegi)
UPDATE classifier.classifier_value
SET valid_until = CURRENT_DATE + 1
WHERE code = 'CAA_11'
  AND parent_key IS NULL
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

-- Uued kirjed kustutada
DELETE FROM classifier.classifier_value
WHERE code IN ('CAA_4.14.1', 'CAA_4.14.2', 'CAA_8.4.1')
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

-- Grupp 8 taastamine
UPDATE classifier.classifier_value
SET code = 'CAA_8.4.1', name = '8.4.1 Vedelikulekked'
WHERE code = 'CAA_8.4.2'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

-- Grupp 4 nimede taastamine
UPDATE classifier.classifier_value
SET name = '4.12 Muud valgustus- ja valgussignalisatsiooniseadmed'
WHERE code = 'CAA_4.12'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

UPDATE classifier.classifier_value
SET name = '4.2.3 Ääre- ja päevatulelaternad — vastavus nõuetele'
WHERE code = 'CAA_4.2.3'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

UPDATE classifier.classifier_value
SET name = '4.2.2 Ääre- ja päevatulelaternad — lülitamine'
WHERE code = 'CAA_4.2.2'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

UPDATE classifier.classifier_value
SET name = '4.2.1 Ääre- ja päevatulelaternad — seisund ja toimimine'
WHERE code = 'CAA_4.2.1'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

-- Grupp 3 taastamine
INSERT INTO classifier.classifier_value (
    classifier_value_key, classifier_key, code, name, description,
    parent_key, valid_from, valid_until, created_by
)
SELECT
    nextval('classifier.seq_classifier_value_key'),
    parent.classifier_key,
    'CAA_3.7',
    '3.7 Aknaklaasi tõstukid',
    'OV',
    parent.classifier_value_key,
    CURRENT_DATE,
    NULL,
    'system'
FROM classifier.classifier_value parent
WHERE parent.code = 'CAA_3'
  AND parent.classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1)
  AND parent.parent_key IS NULL;

-- Grupp 2 nummerduse taastamine (vastupidises järjekorras)
UPDATE classifier.classifier_value
SET code = 'CAA_2.4'
WHERE code = 'CAA_2.5'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

UPDATE classifier.classifier_value
SET code = 'CAA_2.4'
WHERE code = 'CAA_2.6'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

-- CAA_0.3 / CAA_0.4 taastamine
INSERT INTO classifier.classifier_value (
    classifier_value_key, classifier_key, code, name, description,
    parent_key, valid_from, valid_until, created_by
)
SELECT
    nextval('classifier.seq_classifier_value_key'),
    parent.classifier_key,
    t.defect_code,
    t.defect_name,
    t.severities,
    parent.classifier_value_key,
    CURRENT_DATE,
    NULL,
    'system'
FROM (VALUES
        ('CAA_0.3', '0.3 Vastavus liiklusregistri andmetele', 'OV'),
        ('CAA_0.4', '0.4 Parandusmeede', 'OV')
) AS t(defect_code, defect_name, severities)
JOIN classifier.classifier_value parent
  ON parent.code = 'CAA_0'
 AND parent.classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1)
 AND parent.parent_key IS NULL;

-- CAA_10/CAA_11 nimede taastamine (vahetus tagasi)
UPDATE classifier.classifier_value
SET name = 'muu'
WHERE code = 'CAA_10'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

UPDATE classifier.classifier_value
SET name = 'veose kinnitamine'
WHERE code = 'CAA_11'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);
