/*
description: "Update user group name — copy latest snapshot with new name"
namespace: user_group
params:
  user_group_id:
    type: number
    required: false
    description: "user_group_key of the target group"
  name:
    type: string
    required: false
  created_by:
    type: string
    required: false
returns:
  - name: id
    type: number
    nullable: true
*/
WITH latest AS (
    SELECT DISTINCT ON (user_group_key)
        user_group_key, organisations, permissions
    FROM users.user_group
    WHERE user_group_key = :user_group_id::BIGINT
    ORDER BY user_group_key, created_at DESC
)
INSERT INTO users.user_group (user_group_key, name, organisations, permissions, created_by)
SELECT user_group_key, :name, organisations, permissions, :created_by
FROM latest
RETURNING user_group_key AS id;
