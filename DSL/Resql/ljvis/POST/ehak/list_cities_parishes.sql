/*
declaration:
  version: 0.1
  description: "List all cities/parishes of a county (EHAK level 2)"
  method: post
  namespace: ehak
  accepts:
    - field: parentId
      type: number
  returns: json
  response:
    fields:
      - field: classifier_value_key
        type: number
      - field: code
        type: string
      - field: name
        type: string
*/
SELECT
    cv.classifier_value_key AS id,
    cv.code,
    cv.name
FROM classifier.classifier_value cv
WHERE cv.classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'EHAK')
  AND cv.parent_key = :parentId
ORDER BY cv.name;
