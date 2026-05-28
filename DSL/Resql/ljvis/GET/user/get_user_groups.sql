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
    jsonb_array_elements(ual.user_groups)->>'id' AS user_group_id,
    jsonb_array_elements(ual.user_groups)->>'name' AS name
FROM ljvis2.user_account_latest ual
WHERE ual.user_account_id = :user_id::BIGINT
  AND ual.id = (
    SELECT MAX(id) FROM ljvis2.user_account_latest WHERE user_account_id = :user_id::BIGINT
  );
