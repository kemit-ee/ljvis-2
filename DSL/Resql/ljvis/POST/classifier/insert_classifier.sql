/*
description: "Create a new classifier — full snapshot INSERT"
namespace: classifier
params:
  code:
    type: string
    required: false
  name:
    type: string
    required: false
  description:
    type: string
    required: false
  created_by:
    type: string
    required: false
returns:
  - name: id
    type: number
    nullable: true
*/
INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
VALUES (nextval('classifier.seq_classifier_key'), :code, :name, :description, :created_by)
RETURNING classifier_key AS id;
