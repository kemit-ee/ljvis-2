/*
description: "Get user IDs that belong to a user group and whose organisation is in the given list"
namespace: user_group
params:
  user_group_id:
    type: string
    required: false
    description: "user_group_key of the target group"
  organisation_ids:
    type: string
    required: false
    description: "Comma-separated organisation IDs to filter by"
returns:
  - name: user_ids
    type: string
    nullable: true
*/
WITH org_list AS (
    SELECT unnest(string_to_array(NULLIF(:organisation_ids, ''), ','))::BIGINT AS org_id
),
latest_users AS (
    SELECT DISTINCT ON (user_account_key)
        user_account_key,
        organisation_id,
        user_groups
    FROM users.user_account
    ORDER BY user_account_key, created_at DESC
)
SELECT string_agg(lu.user_account_key::TEXT, ',') AS user_ids
FROM latest_users lu
WHERE :user_group_id::BIGINT = ANY(lu.user_groups)
  AND lu.organisation_id IN (SELECT org_id FROM org_list);
