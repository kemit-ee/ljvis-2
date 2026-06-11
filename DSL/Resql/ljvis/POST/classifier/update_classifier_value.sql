/*
declaration:
  version: 0.1
  description: "Edit classifier value — copy latest snapshot with new validity dates and optional name"
  method: post
  accepts: json
  returns: json
  namespace: classifier
  allowlist:
    body:
      - field: classifier_value_id
        type: string
        description: "classifier_value_key of the target value"
      - field: name
        type: string
        description: "New name; omit or leave empty to carry forward existing name"
      - field: valid_from
        type: string
      - field: valid_until
        type: string
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
*/
WITH latest AS (
    SELECT DISTINCT ON (classifier_value_key)
        classifier_value_key, classifier_key, code, name
    FROM ljvis2.classifier_value
    WHERE classifier_value_key = :classifier_value_id::BIGINT
    ORDER BY classifier_value_key, created_at DESC
)
INSERT INTO ljvis2.classifier_value (
    classifier_value_key, classifier_key,
    code, name, valid_from, valid_until, created_by
)
SELECT
    l.classifier_value_key, l.classifier_key,
    l.code,
    CASE WHEN COALESCE(:name, '') = '' THEN l.name ELSE :name END,
    :valid_from::DATE,
    CASE WHEN COALESCE(:valid_until, '') = '' THEN NULL ELSE :valid_until::DATE END,
    :created_by
FROM latest l
RETURNING classifier_value_key AS id;
