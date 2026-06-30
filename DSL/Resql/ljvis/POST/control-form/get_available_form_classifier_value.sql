/*
declaration:
  version: 0.1
  description: "Get classifier value by code where classifier code is FORM_TYPE"
  method: post
  namespace: control-form
  returns: json
  allowlist:
    body:
      - field: code
        type: string
        description: "Classifier value code"
  response:
    fields:
      - field: name
        type: string
      - field: description
        type: string
      - field: hasParent
        type: boolean
*/
SELECT DISTINCT ON (cv.classifier_value_key)
    cv.name,
    cv.description,
    cv.parent_key IS NOT NULL AS has_parent
FROM classifier.classifier_value cv
WHERE cv.code = :code
  AND cv.classifier_key = (
      SELECT DISTINCT ON (classifier_key) classifier_key
      FROM classifier.classifier
      WHERE code = 'FORM_TYPE'
      ORDER BY classifier_key, created_at DESC
  )
ORDER BY cv.classifier_value_key, cv.created_at DESC
LIMIT 1;
