/*
declaration:
  version: 0.1
  description: "Get classifier values by multiple codes where classifier code is FORM_TYPE"
  method: post
  namespace: control-form
  returns: json
  allowlist:
    body:
      - field: codes
        type: string
        description: "Comma-separated classifier value codes"
  response:
    fields:
      - field: classifierCode
        type: string
      - field: name
        type: string
      - field: description
        type: string
      - field: hasParent
        type: boolean
*/
SELECT DISTINCT ON (cv.code)
    cv.code         AS classifier_code,
    cv.name,
    cv.description,
    cv.parent_key IS NOT NULL AS has_parent
FROM classifier.classifier_value cv
WHERE cv.code = ANY(string_to_array(:codes, ','))
  AND cv.classifier_key = (
    SELECT DISTINCT ON (classifier_key) classifier_key
    FROM classifier.classifier
    WHERE code = 'FORM_TYPE'
    ORDER BY classifier_key, created_at DESC
    )
ORDER BY cv.code, cv.created_at DESC;
