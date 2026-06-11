/*
declaration:
  version: 0.1
  description: "Check if another user already has the given personal_code (for update conflict detection)"
  method: post
  namespace: user
  returns: json
  allowlist:
    body:
      - field: personal_code
        type: string
        description: "Personal code to check"
      - field: id
        type: string
        description: "Optional: ID of the user being updated (excluded from check)"
  response:
    fields:
      - field: id
        type: string
*/
SELECT DISTINCT ON (ua.user_account_key) ua.user_account_key AS id
FROM ljvis2.user_account ua
WHERE ua.personal_code = :personal_code
  AND (COALESCE(:id, '') = '' OR ua.user_account_key != :id::BIGINT)
ORDER BY ua.user_account_key, ua.created_at DESC
LIMIT 1;
