/*
description: Lean lookup of a user's current organisation id by personal code. Used on the audit-write
  hot path (log-audit-event.yml) to stamp audit_event.organisation_id. Returns no rows for system actors
  / unknown personal codes.
namespace: user
params:
  personal_code:
    type: string
    required: false
    description: Actor personal code (isikukood)
returns:
- name: organisation_id
  type: string
  nullable: true
*/
SELECT DISTINCT ON (user_account_key)
    organisation_id::TEXT AS organisation_id
FROM users.user_account
WHERE personal_code = :personal_code
ORDER BY user_account_key, created_at DESC
LIMIT 1;
