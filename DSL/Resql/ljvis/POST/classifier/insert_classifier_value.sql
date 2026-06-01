/*
declaration:
  version: 0.1
  description: "Insert a new classifier value"
  method: post
  namespace: classifier
  returns: json
  allowlist:
    body:
      - field: classifier_id
        type: string
        description: "Classifier ID"
      - field: code
        type: string
        description: "Classifier value code"
      - field: name
        type: string
        description: "Classifier value name"
      - field: created_by
        type: string
        description: "User ID who created the value"
  response:
    fields:
      - field: id
        type: string
*/
INSERT INTO ljvis2.classifier_value (
  classifier_id,
  code,
  name,
  created_by
)
VALUES (
  :classifier_id::BIGINT,
  :code,
  :name,
  :created_by::BIGINT
)
RETURNING
  id;
