/*
description: "Check if another user already has the given personal_code (for update conflict detection)"
namespace: user
params:
  personal_code:
    type: string
    required: false
    description: "Personal code to check"
  id:
    type: string
    required: false
    description: "Optional: ID of the user being updated (excluded from check)"
returns:
  - name: id
    type: string
    nullable: true
*/
SELECT DISTINCT ON (ua.user_account_key) ua.user_account_key AS id
FROM users.user_account ua
WHERE ua.personal_code = :personal_code
  AND (COALESCE(:id, '') = '' OR ua.user_account_key::TEXT != :id)
ORDER BY ua.user_account_key, ua.created_at DESC
LIMIT 1;
