/*
declaration:
  version: 0.1
  description: "Rebuild classifier_value_latest snapshot for one or more classifier values after any write operation"
  method: post
  accepts: json
  returns: json
  namespace: classifier
  allowlist:
    body:
      - field: classifier_id
        type: string
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: string
*/
INSERT INTO ljvis2.classifier_value_latest (
    classifier_id,
    classifier_value_id,
    classifier_code,
    code,
    name,
    valid_from,
    valid_until,
    created_by
)
SELECT
    cv.classifier_id,
    cv.id,
    (SELECT c.code FROM ljvis2.classifier c WHERE c.id = cv.classifier_id),
    cv.code,
    cv.name,
    (SELECT vs.valid_from FROM ljvis2.classifier_value_validity_state vs WHERE vs.classifier_value_id = cv.id ORDER BY vs.created_at DESC LIMIT 1),
    (SELECT vs.valid_until FROM ljvis2.classifier_value_validity_state vs WHERE vs.classifier_value_id = cv.id ORDER BY vs.created_at DESC LIMIT 1),
    :created_by::BIGINT
FROM ljvis2.classifier_value cv
WHERE cv.classifier_id = :classifier_id::BIGINT
  AND NOT EXISTS (
    SELECT 1 FROM ljvis2.classifier_value_latest cvl
    WHERE cvl.classifier_value_id = cv.id
  )
RETURNING id;
