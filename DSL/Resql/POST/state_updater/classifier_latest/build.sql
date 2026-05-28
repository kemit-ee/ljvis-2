-- classifierId: BIGINT, createdBy: BIGINT
INSERT INTO classifier_latest (classifier_id, code, name, description, created_at, created_by)
SELECT
  c.id,
  c.code,
  cns.name,
  cns.description,
  now(),
  :createdBy
FROM classifier c
, (SELECT name, description FROM classifier_name_state
   WHERE classifier_id = :classifierId
   ORDER BY created_at DESC, id DESC LIMIT 1) cns
WHERE c.id = :classifierId
RETURNING
  id              AS "id",
  classifier_id   AS "classifierId",
  code            AS "code",
  name            AS "name",
  description     AS "description",
  created_at      AS "createdAt",
  created_by      AS "createdBy";
