/*
declaration:
  version: 0.1
  description: "Insert a new classifier value validity state"
  method: post
  accepts: json
  returns: json
  namespace: classifier
  allowlist:
    body:
      - field: classifier_value_id
        type: string
      - field: valid_from
        type: string
      - field: valid_until
        type: string
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: string
*/
INSERT INTO ljvis2.classifier_value_validity_state (
    classifier_value_id,
    valid_from,
    valid_until,
    created_by
)
VALUES (
    :classifier_value_id::BIGINT,
    :valid_from::DATE,
    CASE WHEN COALESCE(:valid_until, '') = '' THEN NULL ELSE :valid_until::DATE END,
    :created_by::BIGINT
)
RETURNING id;
