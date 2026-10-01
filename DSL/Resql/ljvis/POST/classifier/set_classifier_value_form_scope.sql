/*
description: ADR-011 — asenda klassifikaatori väärtuse vormipiirang tervikuna. Tühi form_type_codes = piirang eemaldatakse (väärtus lubatud kõigil vormidel). Tundmatud (FORM_TYPE-is puuduvad) koodid ignoreeritakse.
namespace: classifier
params:
  classifier_value_id:
    type: integer
    required: false
    description: classifier_value_key of the target value
  form_type_codes:
    type: string
    required: false
    description: Comma-separated FORM_TYPE value codes; empty = no restriction
  created_by:
    type: string
    required: false
returns:
- name: removed
  type: number
  nullable: true
- name: added
  type: number
  nullable: true
*/
WITH wanted AS (
    SELECT DISTINCT btrim(code) AS code
    FROM unnest(string_to_array(NULLIF(:form_type_codes, ''), ',')) AS code
    WHERE btrim(code) <> ''
),
valid AS (
    SELECT w.code
    FROM wanted w
    WHERE EXISTS (
        SELECT 1
        FROM classifier.classifier_value cv
        JOIN classifier.classifier c ON c.classifier_key = cv.classifier_key
        WHERE c.code = 'FORM_TYPE'
          AND cv.code = w.code
    )
),
del AS (
    DELETE FROM classifier.classifier_value_form_scope s
    WHERE s.classifier_value_key = :classifier_value_id::BIGINT
      AND s.form_type_code NOT IN (SELECT code FROM valid)
    RETURNING s.form_type_code
),
ins AS (
    INSERT INTO classifier.classifier_value_form_scope (classifier_value_key, form_type_code, created_by)
    SELECT :classifier_value_id::BIGINT, v.code, COALESCE(NULLIF(:created_by, ''), 'system')
    FROM valid v
    ON CONFLICT (classifier_value_key, form_type_code) DO NOTHING
    RETURNING form_type_code
)
SELECT
    (SELECT count(*) FROM del) AS removed,
    (SELECT count(*) FROM ins) AS added;
