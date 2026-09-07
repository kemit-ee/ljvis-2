/*
description: Get a single classifier value by classifier_value_id
namespace: classifier
params:
  classifier_value_id:
    type: number
    required: false
*/
SELECT
    cv.classifier_key       AS classifier_id,
    cv.classifier_value_key AS classifier_value_id,
    cv.code,
    cv.name,
    cv.valid_from,
    cv.valid_until
FROM classifier.classifier_value cv
WHERE cv.classifier_value_key = :classifier_value_id::BIGINT
ORDER BY cv.created_at DESC
LIMIT 1;
