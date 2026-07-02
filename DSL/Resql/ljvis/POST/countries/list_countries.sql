/*
declaration:
  version: 0.1
  description: "List all countries"
  method: post
  namespace: countries
  returns: json
  response:
    fields:
      - field: code
        type: string
      - field: name
        type: string
*/
SELECT
    code,
    name
FROM classifier.classifier_value
WHERE classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'COUNTRY')
ORDER BY name;
