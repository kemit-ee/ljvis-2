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
    SELECT DISTINCT ON (user_group_id)
        user_group_id,
        organisations
    FROM ljvis2.user_group_latest
    ORDER BY user_group_id, created_at DESC
)
SELECT
    (elem->>'id')::BIGINT AS organisation_id,
    elem->>'name'         AS name
FROM latest,
     JSONB_ARRAY_ELEMENTS(organisations) AS elem
WHERE user_group_id = :user_group_id::BIGINT
ORDER BY name;
