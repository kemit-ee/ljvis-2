/*
declaration:
  version: 0.1
  description: "Get all user groups assigned to a specific user"
  method: get
  namespace: user
  returns: json
  allowlist:
    query:
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
SELECT
    uaug.user_group_id,
    (SELECT ns.name FROM ljvis2.user_group_name_state ns WHERE ns.user_group_id = uaug.user_group_id ORDER BY ns.created_at DESC LIMIT 1) AS name
FROM ljvis2.user_account_user_group uaug
WHERE uaug.user_account_id = :user_id::BIGINT
  AND (SELECT uaugs.status FROM ljvis2.user_account_user_group_state uaugs WHERE uaugs.user_account_user_group_id = uaug.id ORDER BY uaugs.created_at DESC LIMIT 1) = 'active'
ORDER BY name;
