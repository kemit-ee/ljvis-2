/*
declaration:
  version: 0.1
  description: "Update user group name — copy latest snapshot with new name"
  method: post
  accepts: json
  returns: json
  namespace: user_group
  allowlist:
    body:
      - field: user_group_id
        type: number
        description: "user_group_key of the target group"
      - field: name
        type: string
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
*/
WITH latest AS (
    SELECT DISTINCT ON (user_group_key)
        user_group_key, organisations, permissions
    FROM ljvis2.user_group
    WHERE user_group_key = :user_group_id::BIGINT
    ORDER BY user_group_key, created_at DESC
)
INSERT INTO ljvis2.user_group (user_group_key, name, organisations, permissions, created_by)
SELECT user_group_key, :name, organisations, permissions, :created_by
FROM latest
RETURNING user_group_key AS id;
