/*
declaration:
  version: 0.1
  description: "Get user IDs that belong to a user group and whose organisation is in the given list"
  method: post
  accepts: json
  returns: json
  namespace: user_group
  allowlist:
    body:
      - field: user_group_id
        type: string
        description: "user_group_key of the target group"
      - field: organisation_ids
        type: string
        description: "Comma-separated organisation IDs to filter by"
  response:
    fields:
      - field: user_ids
        type: string
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
