/*
description: Create a new classifier value — full snapshot INSERT
namespace: classifier
params:
  classifier_id:
    type: integer
    required: false
    description: classifier_key of the owning classifier
  code:
    type: string
    required: false
  name:
    type: string
    required: false
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
INSERT INTO classifier.classifier_value (
    classifier_value_key, classifier_key,
    code, name, valid_from, valid_until, created_by
)
SELECT
    nextval('classifier.seq_classifier_value_key'),
    :classifier_id::BIGINT,
    :code,
    :name,
    :valid_from::DATE,
    CASE WHEN COALESCE(:valid_until, '') = '' THEN NULL ELSE :valid_until::DATE END,
    :created_by
-- Kood peab klassifikaatori piires olema unikaalne (frontendi getByCode
-- dedubleerib koodi järgi ja peidaks duplikaadi vaikselt). Duplikaadi korral
-- ei lisata midagi ja vastus on tühi.
WHERE NOT EXISTS (
    SELECT 1
    FROM classifier.classifier_value cv
    WHERE cv.classifier_key = :classifier_id::BIGINT
      AND cv.code = :code
)
RETURNING classifier_value_key AS id;
