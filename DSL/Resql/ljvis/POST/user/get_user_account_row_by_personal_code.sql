/*
description: Get the latest active user_account physical row id and display info by personal_code. Used to populate actor_user_account_id in audit events.
namespace: user
params:
  personal_code:
    type: string
    required: false
    description: User personal code (isikukood)
returns:
- name: row_id
  type: string
  nullable: true
- name: user_account_key
  type: string
  nullable: true
- name: first_name
  type: string
  nullable: true
- name: last_name
  type: string
  nullable: true
- name: organisation_id
  type: string
  nullable: true
*/
SELECT DISTINCT ON (ua.user_account_key)
    ua.id          AS row_id,
    ua.user_account_key,
    ua.first_name,
    ua.last_name,
    ua.organisation_id
FROM users.user_account ua
WHERE ua.personal_code = :personal_code
  AND ua.status = 'active'
ORDER BY ua.user_account_key, ua.created_at DESC
LIMIT 1;
