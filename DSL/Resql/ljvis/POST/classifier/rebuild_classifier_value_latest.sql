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
      - field: classifier_value_id
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
    is_valid,
    created_by
)
SELECT
    cv.classifier_id,
    cv.id,
    (SELECT code FROM ljvis2.classifier WHERE id = cv.classifier_id LIMIT 1),
    cv.code,
    cv.name,
    cvvs.valid_from,
    cvvs.valid_until,
    (cvvs.valid_from <= CURRENT_DATE AND (cvvs.valid_until IS NULL OR cvvs.valid_until >= CURRENT_DATE)),
    :created_by::BIGINT
FROM ljvis2.classifier_value cv
        , (SELECT valid_from, valid_until FROM ljvis2.classifier_value_validity_state
    WHERE classifier_value_id = :classifier_value_id::BIGINT
    ORDER BY created_at DESC, id DESC LIMIT 1) cvvs
WHERE cv.id = :classifier_value_id::BIGINT
RETURNING id, classifier_code;
