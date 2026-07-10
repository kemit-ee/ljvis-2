/*
declaration:
  version: 0.1
  description: "List all trailer categories"
  method: post
  namespace: trailers
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
WHERE cv.classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TRAILER_CATEGORY')
ORDER BY cv.id;