-- userId: BIGINT, userGroupId: BIGINT, action: VARCHAR ('add' or 'remove'), createdBy: VARCHAR
WITH upsert_link AS (
  INSERT INTO user_account_user_group (user_account_id, user_group_id, created_by)
  SELECT :userId, :userGroupId, :createdBy
  WHERE :action = 'add'
    AND NOT EXISTS (
      SELECT 1 FROM user_account_user_group
      WHERE user_account_id = :userId AND user_group_id = :userGroupId
    )
  RETURNING id AS membership_id
),
existing_link AS (
  SELECT id AS membership_id
  FROM user_account_user_group
  WHERE user_account_id = :userId AND user_group_id = :userGroupId
  LIMIT 1
),
all_link AS (
  SELECT membership_id FROM upsert_link
  UNION ALL
  SELECT membership_id FROM existing_link WHERE :action = 'remove'
)
INSERT INTO user_account_user_group_state (user_account_user_group_id, status, created_by)
SELECT al.membership_id,
  CASE WHEN :action = 'add' THEN 'active' ELSE 'removed' END,
  :createdBy
FROM all_link al
RETURNING
  user_account_user_group_id AS "membershipId",
  status                     AS "status",
  created_at                 AS "createdAt";
