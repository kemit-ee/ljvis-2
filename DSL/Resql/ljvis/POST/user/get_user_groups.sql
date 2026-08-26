/*
declaration:
  version: 0.1
  description: "Get all user groups assigned to a specific user"
  method: post
  namespace: user
  returns: json
  allowlist:
    body:
      - field: user_id
        type: string
        description: "User ID"
  response:
    fields:
      - field: user_group_id
        type: string
      - field: name
        type: string
*/
WITH latest_user AS (
    SELECT DISTINCT ON (user_account_key)
        user_groups
    FROM users.user_account
    WHERE user_account_key = :user_id::BIGINT
    ORDER BY user_account_key, created_at DESC
),
user_group_keys AS (
    SELECT grp_key AS user_group_key
    FROM latest_user,
         UNNEST(user_groups) AS grp_key
),
latest_groups AS (
    SELECT DISTINCT ON (ug.user_group_key)
        ug.user_group_key,
        ug.name
    FROM users.user_group ug
    JOIN user_group_keys ugk ON ugk.user_group_key = ug.user_group_key
    ORDER BY ug.user_group_key, ug.created_at DESC
)
SELECT
    user_group_key AS user_group_id,
    name
FROM latest_groups;
