/*
description: "Get organisations linked to a user group"
namespace: user_group
params:
  user_group_id:
    type: string
    required: false
    description: "User group ID"
returns:
  - name: organisation_id
    type: string
    nullable: true
  - name: name
    type: string
    nullable: true
*/
WITH latest AS (
    SELECT DISTINCT ON (user_group_key)
        user_group_key,
        organisations
    FROM users.user_group
    WHERE user_group_key = :user_group_id::BIGINT
    ORDER BY user_group_key, created_at DESC
)
SELECT
    o.id   AS organisation_id,
    o.name
FROM users.organisation o
WHERE o.id IN (SELECT UNNEST(organisations) FROM latest)
ORDER BY o.name;
