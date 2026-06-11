/*
declaration:
  version: 0.1
  description: "Get permissions linked to a user group"
  method: post
  namespace: user_group
  returns: json
  allowlist:
    body:
      - field: user_group_id
        type: string
        description: "User group ID"
  response:
    fields:
      - field: permission_id
        type: string
      - field: code
        type: string
      - field: description
        type: string
*/
WITH latest AS (
    SELECT DISTINCT ON (user_group_key)
        user_group_key,
        permissions
    FROM ljvis2.user_group
    WHERE user_group_key = :user_group_id::BIGINT
    ORDER BY user_group_key, created_at DESC
)
SELECT
    p.id          AS permission_id,
    p.code,
    p.description
FROM ljvis2.permission p
WHERE p.code IN (SELECT UNNEST(permissions) FROM latest)
ORDER BY p.code;
