/*
declaration:
  version: 0.1
  description: "Get user by personal_code (isikukood) for authentication"
  method: post
  namespace: user
  returns: json
  allowlist:
    body:
      - field: personal_code
        type: string
        description: "User personal code (isikukood)"
  response:
    fields:
      - field: id
        type: string
      - field: first_name
        type: string
      - field: last_name
        type: string
      - field: personal_code
        type: string
      - field: organisation_id
        type: string
      - field: organisation_name
        type: string
      - field: status
        type: string
*/
SELECT DISTINCT ON (ua.user_account_key)
    ua.user_account_key AS id,
    ua.first_name,
    ua.last_name,
    ua.personal_code,
    ua.organisation_id,
    ua.organisation_name,
    ua.email,
    ua.status
FROM users.user_account ua
WHERE ua.personal_code = :personal_code
  AND ua.status = 'active'
ORDER BY ua.user_account_key, ua.created_at DESC
LIMIT 1;
