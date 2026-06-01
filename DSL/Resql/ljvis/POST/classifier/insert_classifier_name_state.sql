/*
declaration:
  version: 0.1
  description: "Insert a new classifier name state"
  method: post
  accepts: json
  returns: json
  namespace: classifier
  allowlist:
    body:
      - field: classifier_id
        type: number
      - field: name
        type: string
      - field: description
        type: string
      - field: created_by
        type: number
  response:
    fields:
      - field: id
        type: number
*/
INSERT INTO ljvis2.classifier_name_state (
    classifier_id, name, description, created_by
)
VALUES (
    :classifier_id,
    :name,
    :description,
    :created_by::BIGINT
)
RETURNING id;
