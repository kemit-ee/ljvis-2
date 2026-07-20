/*
declaration:
  version: 0.1
  description: "List of all trailer categories"
  method: post
  namespace: classifier
  returns: json
  response:
    fields:
      - field: classifier_code
        type: string
      - field: code
        type: string
      - field: name
        type: string
*/
SELECT (SELECT code FROM classifier.classifier WHERE cv.classifier_key = classifier_key) AS classifier_code,
       cv.code,
       cv.name
FROM classifier.classifier_value cv
ORDER BY cv.id;