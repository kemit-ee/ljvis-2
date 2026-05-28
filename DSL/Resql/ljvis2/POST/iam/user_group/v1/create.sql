-- name: VARCHAR, createdBy: VARCHAR
-- Note: organisation and permission links are inserted via separate calls from Ruuter
-- This SQL creates the group header + name state only
WITH new_group AS (
  INSERT INTO user_group (created_by)
  VALUES (:createdBy)
  RETURNING id
),
new_name AS (
  INSERT INTO user_group_name_state (user_group_id, name, created_by)
  SELECT ng.id, :name, :createdBy
  FROM new_group ng
  RETURNING user_group_id
)
SELECT user_group_id AS "userGroupId" FROM new_name;
