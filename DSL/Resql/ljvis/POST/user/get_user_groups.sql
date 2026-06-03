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
SELECT
    JSONB_ARRAY_ELEMENTS(ual.user_groups)->>'id' AS user_group_id,
    JSONB_ARRAY_ELEMENTS(ual.user_groups)->>'name' AS name
FROM ljvis2.user_account_latest ual
WHERE ual.user_account_id = :user_id::BIGINT
  AND ual.id = (
    SELECT MAX(id) FROM ljvis2.user_account_latest WHERE user_account_id = :user_id::BIGINT
  );
