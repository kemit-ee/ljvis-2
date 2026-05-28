-- classifierValueId: BIGINT
SELECT
  s.id                   AS "id",
  s.classifier_value_id  AS "classifierValueId",
  s.valid_from           AS "validFrom",
  s.valid_until          AS "validUntil",
  s.created_at           AS "createdAt",
  s.created_by           AS "createdBy"
FROM classifier_value_validity_state s
WHERE s.classifier_value_id = :classifierValueId
ORDER BY s.created_at DESC, s.id DESC
LIMIT 1;
