/*
declaration:
  version: 0.1
  description: "List of all classifier values (latest snapshot per classifier_value_key, with validity)"
  method: post
  namespace: classifier
  returns: json
  response:
    fields:
      - field: classifier_value_key
        type: number
      - field: classifier_code
        type: string
      - field: code
        type: string
      - field: name
        type: string
      - field: parent_key
        type: number
      - field: description
        type: string
      - field: valid_from
        type: string
      - field: valid_until
        type: string
      - field: is_valid
        type: string
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
    v.is_valid
FROM latest_value v
ORDER BY v.classifier_value_key;