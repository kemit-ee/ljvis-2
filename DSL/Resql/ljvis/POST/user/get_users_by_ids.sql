/*
description: "Get personal codes for multiple users by comma-separated IDs"
namespace: user
params:
  user_ids:
    type: string
    required: false
    description: "Comma-separated user_account_key values"
returns:
  - name: personal_code
    type: string
    nullable: true
*/
SELECT DISTINCT ON (ua.user_account_key)
    ua.personal_code
FROM users.user_account ua
WHERE ua.user_account_key = ANY(
    SELECT unnest(string_to_array(:user_ids, ','))::BIGINT
)
ORDER BY ua.user_account_key, ua.created_at DESC;
