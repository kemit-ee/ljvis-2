/*
description: "List all counties (EHAK level 1)"
namespace: ehak
params: {}
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
  AND cv.parent_key IS NULL
ORDER BY cv.name;
