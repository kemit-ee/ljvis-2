/*
declaration:
  version: 0.1
  description: "List all structure units"
  method: post
  namespace: structure-units
  accepts:
    - field: organisationId
      type: number
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
WHERE cv.classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'STRUCTURE_UNIT')
  AND cv.description = (SELECT code FROM users.organisation WHERE id = :organisationId::BIGINT)
ORDER BY cv.name;
