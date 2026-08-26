/*
description: "Get permissions linked to a user group"
namespace: user_group
params:
  user_group_id:
    type: string
    required: false
    description: "User group ID"
returns:
  - name: permission_id
    type: string
    nullable: true
  - name: code
    type: string
    nullable: true
  - name: description
    type: string
    nullable: true
*/
WITH latest AS (
    SELECT DISTINCT ON (user_group_key)
        user_group_key,
        permissions
    FROM users.user_group
    WHERE user_group_key = :user_group_id::BIGINT
    ORDER BY user_group_key, created_at DESC
)
SELECT
    p.id          AS permission_id,
    p.code,
    p.description
FROM users.permission p
WHERE p.code IN (SELECT UNNEST(permissions) FROM latest)
ORDER BY p.code;
