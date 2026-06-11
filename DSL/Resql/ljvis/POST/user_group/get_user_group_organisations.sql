/*
declaration:
  version: 0.1
  description: "Get organisations linked to a user group"
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
      - field: organisation_id
        type: string
      - field: name
        type: string
*/
WITH latest AS (
    SELECT DISTINCT ON (user_group_key)
        user_group_key,
        organisations
    FROM ljvis2.user_group
    WHERE user_group_key = :user_group_id::BIGINT
    ORDER BY user_group_key, created_at DESC
)
SELECT
    o.id   AS organisation_id,
    o.name
FROM ljvis2.organisation o
WHERE o.id IN (SELECT UNNEST(organisations) FROM latest)
ORDER BY o.name;
