/*
description: "Get user by personal_code (isikukood) for authentication"
namespace: user
params:
  personal_code:
    type: string
    required: false
    description: "User personal code (isikukood)"
returns:
  - name: id
    type: string
    nullable: true
  - name: first_name
    type: string
    nullable: true
  - name: last_name
    type: string
    nullable: true
  - name: personal_code
    type: string
    nullable: true
  - name: organisation_id
    type: string
    nullable: true
  - name: organisation_name
    type: string
    nullable: true
  - name: status
    type: string
    nullable: true
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
