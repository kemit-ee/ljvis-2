/*
declaration:
  version: 0.1
  description: "Create a new classifier value — full snapshot INSERT"
  method: post
  namespace: classifier
  returns: json
  allowlist:
    body:
      - field: classifier_id
        type: string
        description: "classifier_key of the owning classifier"
      - field: code
        type: string
      - field: name
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
        type: number
*/
INSERT INTO ljvis2.classifier_value (
    classifier_value_key, classifier_key,
    code, name, valid_from, valid_until, created_by
)
VALUES (
    nextval('ljvis2.seq_classifier_value_key'),
    :classifier_id::BIGINT,
    :code,
    :name,
    :valid_from::DATE,
    CASE WHEN COALESCE(:valid_until, '') = '' THEN NULL ELSE :valid_until::DATE END,
    :created_by
)
RETURNING classifier_value_key AS id;
