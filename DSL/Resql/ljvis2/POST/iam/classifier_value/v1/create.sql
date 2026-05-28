-- classifierId: BIGINT, code: VARCHAR, name: VARCHAR, createdBy: BIGINT
INSERT INTO classifier_value (classifier_id, code, name, created_by)
VALUES (:classifierId, :code, :name, :createdBy)
RETURNING
  id              AS "id",
  classifier_id   AS "classifierId",
  code            AS "code",
  name            AS "name",
  created_at      AS "createdAt",
  created_by      AS "createdBy";
