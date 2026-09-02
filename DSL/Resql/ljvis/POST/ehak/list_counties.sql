/*
declaration:
  version: 0.1
  description: "List all counties (EHAK level 1)"
  method: post
  namespace: ehak
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
WHERE cv.classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'EHAK')
  AND cv.parent_key IS NULL
ORDER BY cv.name;
