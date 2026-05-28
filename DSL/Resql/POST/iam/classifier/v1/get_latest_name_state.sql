-- classifierId: BIGINT
SELECT
  s.id              AS "id",
  s.classifier_id   AS "classifierId",
  s.name            AS "name",
  s.description     AS "description",
  s.created_at      AS "createdAt",
  s.created_by      AS "createdBy"
FROM classifier_name_state s
WHERE s.classifier_id = :classifierId
ORDER BY s.created_at DESC, s.id DESC
LIMIT 1;
