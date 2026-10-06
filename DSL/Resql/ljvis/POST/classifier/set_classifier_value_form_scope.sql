/*
description: ADR-011 — sea klassifikaatori väärtuse vormipiirang soovitud nimekirjaks. INSERT-only - lisatud vormidele rida is_active=TRUE, eemaldatud vormidele rida is_active=FALSE; DELETE/UPDATE ei toimu. Tühi form_type_codes = kõik vormid. Tundmatud (FORM_TYPE-is puuduvad) koodid ignoreeritakse.
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
        WHERE cv.code = w.code
          AND cv.classifier_key = ANY (SELECT c.classifier_key FROM classifier.classifier c WHERE c.code = 'FORM_TYPE')
    )
),
-- kehtiv seis: viimane rida iga vormi kohta
current_active AS (
    SELECT s.form_type_code AS code
    FROM (
        SELECT DISTINCT ON (fs.form_type_code) fs.form_type_code, fs.is_active
        FROM classifier.classifier_value_form_scope fs
        WHERE fs.classifier_value_key = :classifier_value_id::BIGINT
        ORDER BY fs.form_type_code, fs.created_at DESC, fs.id DESC
    ) s
    WHERE s.is_active
),
changes AS (
    SELECT v.code, TRUE AS is_active
    FROM valid v
    WHERE v.code NOT IN (SELECT code FROM current_active)
    UNION ALL
    SELECT a.code, FALSE AS is_active
    FROM current_active a
    WHERE a.code NOT IN (SELECT code FROM valid)
),
ins AS (
    INSERT INTO classifier.classifier_value_form_scope (classifier_value_key, form_type_code, is_active, created_by)
    SELECT :classifier_value_id::BIGINT, ch.code, ch.is_active, COALESCE(NULLIF(:created_by, ''), 'system')
    FROM changes ch
    RETURNING is_active
)
SELECT
    (SELECT count(*) FROM ins WHERE NOT is_active) AS removed,
    (SELECT count(*) FROM ins WHERE is_active) AS added;
