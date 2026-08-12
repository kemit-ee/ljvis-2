/*
declaration:
  version: 0.1
  description: "Get version history snapshots for a trailer technical-check form"
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: id
        type: string
        description: "Trailer technical form key"
  response:
    fields:
      - field: snapshot_id
        type: number
      - field: version
        type: number
      - field: status
        type: string
      - field: created_at
        type: string
      - field: created_by
        type: string
      - field: org_name
        type: string
*/
SELECT
  id AS snapshot_id,
  version,
  status,
  created_at,
  (SELECT first_name || ' ' || last_name FROM users.user_account WHERE user_account.personal_code = created_by ORDER BY user_account.id DESC LIMIT 1) AS created_by,
  (SELECT organisation_name FROM users.user_account WHERE user_account.personal_code = created_by ORDER BY user_account.id DESC LIMIT 1) AS org_name
FROM forms.trailer_technical_form
WHERE trailer_technical_form_key = :id::BIGINT
ORDER BY created_at;
