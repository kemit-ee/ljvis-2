/*
description: Find the currently valid ROAD_OTHER classifier value (other state road) by road number.
  ROAD_OTHER (~3 200 values) is excluded from the bulk classifier endpoints, so the
  compound form looks up a single road name here instead.
namespace: roads
params:
  number:
    type: string
    required: true
returns:
- name: code
  type: string
  nullable: false
- name: name
  type: string
  nullable: false
*/
WITH road_other AS (
    SELECT DISTINCT ON (classifier_key) classifier_key
    FROM classifier.classifier
    WHERE code = 'ROAD_OTHER'
    ORDER BY classifier_key, created_at DESC
),
-- classifier_value on INSERT-only snapshot-tabel: leia koodi järgi kandidaatvõtmed
-- (idx_cv_code) ja võta iga võtme viimane snapshot (idx_cv_key_ts) — nii ei tagastata
-- väärtust, mille kood on hilisemas snapshot'is muudetud.
latest_value AS (
    SELECT DISTINCT ON (cv.classifier_value_key)
        cv.code,
        cv.name,
        cv.valid_from,
        cv.valid_until
    FROM classifier.classifier_value cv
    WHERE cv.classifier_value_key IN (
        SELECT c2.classifier_value_key
        FROM classifier.classifier_value c2
        JOIN road_other ro ON ro.classifier_key = c2.classifier_key
        WHERE c2.code = :number
    )
    ORDER BY cv.classifier_value_key, cv.created_at DESC
)
SELECT code, name
FROM latest_value
WHERE code = :number
  AND valid_from <= CURRENT_DATE
  AND (valid_until IS NULL OR valid_until > CURRENT_DATE)
LIMIT 1;
