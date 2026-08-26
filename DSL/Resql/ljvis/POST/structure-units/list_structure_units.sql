/*
description: "List all structure units"
namespace: structure-units
params:
  organisationId:
    type: number
    required: false
returns:
  - name: code
    type: string
    nullable: true
  - name: name
    type: string
    nullable: true
*/
SELECT
    cv.code,
    cv.name
FROM classifier.classifier_value cv
WHERE cv.classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'STRUCTURE_UNIT')
  AND cv.description = (SELECT code FROM users.organisation WHERE id = :organisationId::BIGINT)
ORDER BY cv.name;
