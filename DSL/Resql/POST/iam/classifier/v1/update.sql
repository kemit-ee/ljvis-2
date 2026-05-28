-- classifierId: BIGINT, name: VARCHAR, description: VARCHAR (optional), createdBy: BIGINT
INSERT INTO classifier_name_state (classifier_id, name, description, created_by)
VALUES (:classifierId, :name, :description, :createdBy)
RETURNING
  id              AS "id",
  classifier_id   AS "classifierId",
  name            AS "name",
  description     AS "description",
  created_at      AS "createdAt",
  created_by      AS "createdBy";
