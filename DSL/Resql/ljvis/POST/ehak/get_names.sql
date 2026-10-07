/*
description: Resolve EHAK classifier value keys (county / city) to names, used by PDF printing
namespace: ehak
params:
  ids:
    type: string
    required: false
    description: Comma-separated classifier_value_key list; empty string returns nothing
returns:
- name: id
  type: string
  nullable: true
- name: name
  type: string
  nullable: true
*/
SELECT
    cv.classifier_value_key::TEXT AS id,
    cv.name
FROM classifier.classifier_value cv
WHERE cv.classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'EHAK')
  AND cv.classifier_value_key = ANY(string_to_array(NULLIF(:ids, ''), ',')::BIGINT[]);
