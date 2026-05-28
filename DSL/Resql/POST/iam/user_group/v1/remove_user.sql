-- userGroupId: BIGINT, userId: BIGINT, createdBy: VARCHAR
INSERT INTO user_account_user_group_state (user_account_user_group_id, status, created_by)
SELECT uaug.id, 'removed', :createdBy
FROM user_account_user_group uaug
WHERE uaug.user_account_id = :userId
  AND uaug.user_group_id   = :userGroupId
ORDER BY uaug.id DESC
LIMIT 1
RETURNING
  user_account_user_group_id AS "membershipId",
  status                     AS "status",
  created_at                 AS "createdAt";
