/*
declaration:
  version: 0.1
  description: "Lean lookup of a user's current organisation id by personal code. Used on the audit-write hot path (log-audit-event.yml) to stamp audit_event.organisation_id. Returns no rows for system actors / unknown personal codes."
  method: post
  namespace: user
  returns: json
  allowlist:
    body:
      - field: personal_code
        type: string
        description: "Actor personal code (isikukood)"
  response:
    fields:
      - field: organisation_id
        type: string
*/
SELECT DISTINCT ON (user_account_key)
    organisation_id::TEXT AS organisation_id
FROM users.user_account
WHERE personal_code = :personal_code
ORDER BY user_account_key, created_at DESC
LIMIT 1;
