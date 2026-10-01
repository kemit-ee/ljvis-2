/*
description: List of all classifier values (latest snapshot per classifier_value_key, with validity)
namespace: classifier
params: {}
returns:
- name: classifier_value_key
  type: number
  nullable: true
- name: classifier_code
  type: string
  nullable: true
- name: code
  type: string
  nullable: true
- name: name
  type: string
  nullable: true
- name: parent_key
  type: number
  nullable: true
- name: description
  type: string
  nullable: true
- name: valid_from
  type: string
  nullable: true
- name: valid_until
  type: string
  nullable: true
- name: is_valid
  type: string
  nullable: true
- name: form_types
  type: array
  nullable: true
*/
-- classifier and classifier_value are INSERT-only snapshot tables: every edit
-- appends a new row sharing the same *_key. The classifier_code subquery must
-- pick the latest snapshot (ORDER BY created_at DESC LIMIT 1), otherwise a
-- classifier that has ever been edited returns >1 row and the whole query fails
-- with "more than one row returned by a subquery used as an expression".
WITH latest_value AS (
    SELECT DISTINCT ON (classifier_value_key)
        classifier_value_key,
        classifier_key,
        code,
        name,
        parent_key,
        description,
        valid_from,
        valid_until,
        (valid_from <= CURRENT_DATE AND (valid_until IS NULL OR valid_until > CURRENT_DATE)) AS is_valid
    FROM classifier.classifier_value
    ORDER BY classifier_value_key, created_at DESC
)
SELECT
    v.classifier_value_key,
    (SELECT code FROM classifier.classifier
      WHERE classifier_key = v.classifier_key
      ORDER BY created_at DESC
      LIMIT 1) AS classifier_code,
    v.code,
    v.name,
    v.parent_key,
    v.description,
    v.valid_from,
    v.valid_until,
    v.is_valid,
    -- ADR-011: tühi massiiv = väärtus on lubatud kõigil vormidel
    COALESCE((SELECT array_agg(s.form_type_code ORDER BY s.form_type_code)
              FROM (SELECT DISTINCT ON (fs.form_type_code) fs.form_type_code, fs.is_active
                      FROM classifier.classifier_value_form_scope fs
                     WHERE fs.classifier_value_key = v.classifier_value_key
                     ORDER BY fs.form_type_code, fs.created_at DESC, fs.id DESC) s
             WHERE s.is_active), ARRAY[]::TEXT[]) AS form_types
FROM latest_value v
ORDER BY v.classifier_value_key;