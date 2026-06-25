/*
declaration:
  version: 0.1
  description: "Get personal codes for multiple users by comma-separated IDs"
  method: post
  namespace: user
  returns: json
  allowlist:
    body:
      - field: user_ids
        type: string
        description: "Comma-separated user_account_key values"
  response:
    fields:
      - field: personal_code
        type: string
*/
SELECT DISTINCT ON (ua.user_account_key)
    ua.personal_code
FROM users.user_account ua
WHERE ua.user_account_key = ANY(string_to_array(:user_ids, ',')::BIGINT[])
ORDER BY ua.user_account_key, ua.created_at DESC;
