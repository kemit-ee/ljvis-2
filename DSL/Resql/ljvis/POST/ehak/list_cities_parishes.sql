/*
description: "List all cities/parishes of a county (EHAK level 2)"
namespace: ehak
params:
  parentId:
    type: number
    required: false
returns:
  - name: classifier_value_key
    type: number
    nullable: true
  - name: code
    type: string
    nullable: true
  - name: name
    type: string
    nullable: true
*/
SELECT
    cv.classifier_value_key AS id,
    cv.code,
    cv.name
FROM classifier.classifier_value cv
WHERE cv.classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'EHAK')
  AND cv.parent_key = :parentId
ORDER BY cv.name;
