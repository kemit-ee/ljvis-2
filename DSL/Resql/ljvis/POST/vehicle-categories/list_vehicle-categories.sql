/*
declaration:
  version: 0.1
  description: "List all of vehicle categories"
  method: post
  namespace: vehicle-categories
  returns: json
  response:
    fields:
      - field: code
        type: string
      - field: name
        type: string
*/
SELECT
    cv.code,
    cv.name
FROM classifier.classifier_value cv
WHERE cv.classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'VEHICLE_CATEGORY')
ORDER BY cv.id;