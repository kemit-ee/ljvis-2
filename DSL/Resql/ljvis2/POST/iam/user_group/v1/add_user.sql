-- userGroupId: BIGINT, userId: BIGINT, createdBy: VARCHAR
WITH new_link AS (
  INSERT INTO user_account_user_group (user_account_id, user_group_id, created_by)
  VALUES (:userId, :userGroupId, :createdBy)
  RETURNING id
)
INSERT INTO user_account_user_group_state (user_account_user_group_id, status, created_by)
SELECT nl.id, 'active', :createdBy
FROM new_link nl
RETURNING
  user_account_user_group_id AS "membershipId",
  status                     AS "status",
  created_at                 AS "createdAt";
