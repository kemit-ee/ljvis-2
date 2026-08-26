/*
description: "List of all classifier values (latest snapshot per classifier_value_key, with validity)"
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
*/
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
    (SELECT code FROM classifier.classifier WHERE v.classifier_key = classifier_key) AS classifier_code,
    v.code,
    v.name,
    v.parent_key,
    v.description,
    v.valid_from,
    v.valid_until,
    v.is_valid
FROM latest_value v
ORDER BY v.classifier_value_key;