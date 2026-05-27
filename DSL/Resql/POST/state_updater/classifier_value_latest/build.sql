-- classifierValueId: BIGINT, createdBy: BIGINT
INSERT INTO classifier_value_latest (
  classifier_value_id, classifier_id, classifier_code,
  code, name, valid_from, valid_until, is_valid, created_at, created_by
)
SELECT
  cv.id,
  cv.classifier_id,
  (SELECT code FROM classifier WHERE id = cv.classifier_id LIMIT 1),
  cv.code,
  cv.name,
  cvvs.valid_from,
  cvvs.valid_until,
  (cvvs.valid_from <= CURRENT_DATE AND (cvvs.valid_until IS NULL OR cvvs.valid_until >= CURRENT_DATE)),
  now(),
  :createdBy
FROM classifier_value cv
, (SELECT valid_from, valid_until FROM classifier_value_validity_state
   WHERE classifier_value_id = :classifierValueId
   ORDER BY created_at DESC, id DESC LIMIT 1) cvvs
WHERE cv.id = :classifierValueId
RETURNING
  id                   AS "id",
  classifier_value_id  AS "classifierValueId",
  classifier_id        AS "classifierId",
  classifier_code      AS "classifierCode",
  code                 AS "code",
  name                 AS "name",
  valid_from           AS "validFrom",
  valid_until          AS "validUntil",
  is_valid             AS "isValid",
  created_at           AS "createdAt",
  created_by           AS "createdBy";
