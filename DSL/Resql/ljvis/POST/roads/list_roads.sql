/*
description: "List all roads"
namespace: structure-units
params: {}
returns:
  - name: code
    type: string
    nullable: true
  - name: name
    type: string
    nullable: true
*/
SELECT
    cv.code,
    cv.name
FROM classifier.classifier_value cv
WHERE cv.classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'ROAD_NAME')
ORDER BY cv.id;