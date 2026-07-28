/*
declaration:
  version: 0.1
  description: "List of all trailer categories"
  method: post
  namespace: classifier
  returns: json
  response:
    fields:
      - field: classifier_value_key
        type: number
      - field: classifier_code
        type: string
      - field: code
        type: string
      - field: name
        type: string
      - field: parent_key
        type: number
      - field: description
        type: string
*/
SELECT cv.classifier_value_key,
       (SELECT code FROM classifier.classifier WHERE cv.classifier_key = classifier_key) AS classifier_code,
       cv.code,
       cv.name,
       cv.parent_key,
       cv.description
FROM classifier.classifier_value cv
ORDER BY cv.id;