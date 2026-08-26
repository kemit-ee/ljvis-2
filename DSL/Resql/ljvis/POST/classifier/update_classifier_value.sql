/*
description: "Edit classifier value — copy latest snapshot with new validity dates and optional name"
namespace: classifier
params:
  classifier_value_id:
    type: number
    required: false
    description: "classifier_value_key of the target value"
  name:
    type: string
    required: false
    description: "New name; omit or leave empty to carry forward existing name"
  valid_from:
    type: string
    required: false
  valid_until:
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
    SELECT DISTINCT ON (classifier_value_key)
        classifier_value_key, classifier_key, code, name
    FROM classifier.classifier_value
    WHERE classifier_value_key = :classifier_value_id::BIGINT
    ORDER BY classifier_value_key, created_at DESC
)
INSERT INTO classifier.classifier_value (
    classifier_value_key, classifier_key,
    code, name, valid_from, valid_until, created_by
)
SELECT
    l.classifier_value_key, l.classifier_key,
    l.code,
    CASE WHEN COALESCE(:name, '') = '' THEN l.name ELSE :name END,
    :valid_from::DATE,
    CASE WHEN COALESCE(:valid_until, '') = '' THEN NULL ELSE :valid_until::DATE END,
    :created_by
FROM latest l
RETURNING classifier_value_key AS id;
