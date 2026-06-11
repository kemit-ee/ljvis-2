/*
declaration:
  version: 0.1
  description: "Edit classifier name/description — copy latest snapshot with new values"
  method: post
  accepts: json
  returns: json
  namespace: classifier
  allowlist:
    body:
      - field: classifier_id
        type: string
        description: "classifier_key of the target classifier"
      - field: name
        type: string
      - field: description
        type: string
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
*/
WITH latest AS (
    SELECT DISTINCT ON (classifier_key)
        classifier_key, code
    FROM ljvis2.classifier
    WHERE classifier_key = :classifier_id::BIGINT
    ORDER BY classifier_key, created_at DESC
)
INSERT INTO ljvis2.classifier (classifier_key, code, name, description, created_by)
SELECT classifier_key, code, :name, :description, :created_by
FROM latest
RETURNING classifier_key AS id;
