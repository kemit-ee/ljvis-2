/*
description: Get all classifiers with all their (valid + invalid) values, flattened, for FE bulk bundle
  loading
namespace: classifier
params: {}
returns:
- name: classifier_id
  type: string
  nullable: true
- name: classifier_code
  type: string
  nullable: true
- name: classifier_name
  type: string
  nullable: true
- name: classifier_value_id
  type: string
  nullable: true
- name: parent_key
  type: string
  nullable: true
- name: code
  type: string
  nullable: true
- name: name
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
*/
WITH latest_classifier AS (
    SELECT DISTINCT ON (classifier_key)
        classifier_key,
        code,
        name
    FROM classifier.classifier
    ORDER BY classifier_key, created_at DESC
),
latest_value AS (
    SELECT DISTINCT ON (classifier_value_key)
        classifier_key,
        classifier_value_key,
        code,
        name,
        parent_key,
        valid_from,
        valid_until,
        (valid_from <= CURRENT_DATE AND (valid_until IS NULL OR valid_until > CURRENT_DATE)) AS is_valid
    FROM classifier.classifier_value
    ORDER BY classifier_value_key, created_at DESC
)
-- klassifikaator ilma ühegi väärtuseta (varem LEFT JOIN-i NULL-väärtustega rida)
SELECT
    c.classifier_key   AS classifier_id,
    c.code              AS classifier_code,
    c.name              AS classifier_name,
    NULL::bigint        AS classifier_value_id,
    NULL::bigint        AS parent_key,
    NULL::varchar       AS code,
    NULL::varchar       AS name,
    NULL::date          AS valid_from,
    NULL::date          AS valid_until,
    NULL::boolean       AS is_valid
FROM latest_classifier c
WHERE NOT EXISTS (SELECT 1 FROM latest_value v WHERE v.classifier_key = c.classifier_key)
UNION ALL
-- klassifikaatori väärtused; klassifikaatori andmed alampäringuga, mitte JOIN-iga
SELECT
    v.classifier_key   AS classifier_id,
    (SELECT c.code FROM latest_classifier c WHERE c.classifier_key = v.classifier_key) AS classifier_code,
    (SELECT c.name FROM latest_classifier c WHERE c.classifier_key = v.classifier_key) AS classifier_name,
    v.classifier_value_key AS classifier_value_id,
    v.parent_key,
    v.code,
    v.name,
    v.valid_from,
    v.valid_until,
    v.is_valid
FROM latest_value v
WHERE EXISTS (SELECT 1 FROM latest_classifier c WHERE c.classifier_key = v.classifier_key)
ORDER BY classifier_code, parent_key NULLS FIRST, code;
