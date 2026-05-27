-- userGroupId: BIGINT, name: VARCHAR, createdBy: VARCHAR
INSERT INTO user_group_name_state (user_group_id, name, created_by)
VALUES (:userGroupId, :name, :createdBy)
RETURNING
  user_group_id AS "userGroupId",
  name          AS "name",
  created_at    AS "createdAt";
