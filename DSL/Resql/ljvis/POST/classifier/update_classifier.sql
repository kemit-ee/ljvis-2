/*
description: "Edit classifier name/description — copy latest snapshot with new values"
namespace: classifier
params:
  classifier_id:
    type: string
    required: false
    description: "classifier_key of the target classifier"
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
WITH latest AS (
    SELECT DISTINCT ON (classifier_key)
        classifier_key, code
    FROM classifier.classifier
    WHERE classifier_key = :classifier_id::BIGINT
    ORDER BY classifier_key, created_at DESC
)
INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
SELECT classifier_key, code, :name, :description, :created_by
FROM latest
RETURNING classifier_key AS id;
