/*
declaration:
  version: 0.1
  description: "Check if another user already has the given personal_code (for update conflict detection)"
  method: get
  namespace: user
  returns: json
  allowlist:
    query:
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
SELECT ual.user_account_id AS id
FROM ljvis2.user_account_latest ual
WHERE ual.personal_code = :personal_code
  AND (COALESCE(:id, '') = '' OR ual.user_account_id != :id::BIGINT)
  AND ual.id = (
      SELECT id FROM ljvis2.user_account_latest ual2
      WHERE ual2.user_account_id = ual.user_account_id
      ORDER BY ual2.created_at DESC LIMIT 1
  )
LIMIT 1;
