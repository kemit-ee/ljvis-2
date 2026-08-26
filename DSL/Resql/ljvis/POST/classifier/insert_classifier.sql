/*
declaration:
  version: 0.1
  description: "Create a new classifier — full snapshot INSERT"
  method: post
  accepts: json
  returns: json
  namespace: classifier
  allowlist:
    body:
      - field: code
        type: string
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
INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
VALUES (nextval('classifier.seq_classifier_key'), :code, :name, :description, :created_by)
RETURNING classifier_key AS id;
