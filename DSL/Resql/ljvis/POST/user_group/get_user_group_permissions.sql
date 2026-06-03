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
    SELECT DISTINCT ON (user_group_id)
        user_group_id,
        permissions
    FROM ljvis2.user_group_latest
    ORDER BY user_group_id, created_at DESC
)
SELECT
    (elem->>'id')::BIGINT AS permission_id,
    elem->>'code'         AS code,
    elem->>'description'  AS description
FROM latest,
     JSONB_ARRAY_ELEMENTS(permissions) AS elem
WHERE user_group_id = :user_group_id::BIGINT
ORDER BY code;
