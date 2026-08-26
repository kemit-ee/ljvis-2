/*
declaration:
  version: 0.1
  description: "Get all classifiers with all their (valid + invalid) values, flattened, for FE bulk bundle loading"
  method: post
  namespace: classifier
  returns: json
  response:
    fields:
      - field: classifier_id
        type: string
      - field: classifier_code
        type: string
      - field: classifier_name
        type: string
      - field: classifier_value_id
        type: string
      - field: parent_key
        type: string
      - field: code
        type: string
      - field: name
        type: string
      - field: valid_from
        type: string
      - field: valid_until
        type: string
      - field: is_valid
        type: string
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
SELECT
    c.classifier_key   AS classifier_id,
    c.code              AS classifier_code,
    c.name              AS classifier_name,
    v.classifier_value_key AS classifier_value_id,
    v.parent_key,
    v.code,
    v.name,
    v.valid_from,
    v.valid_until,
    v.is_valid
FROM latest_classifier c
LEFT JOIN latest_value v ON v.classifier_key = c.classifier_key
ORDER BY c.code, v.parent_key NULLS FIRST, v.code;
