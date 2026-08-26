/*
description: "List all of vehicle categories"
namespace: vehicle-categories
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
WHERE cv.classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'VEHICLE_CATEGORY')
ORDER BY cv.id;