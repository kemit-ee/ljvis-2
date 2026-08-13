/*
declaration:
  version: 0.1
  description: "Get version history snapshots for a good repute form"
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: id
        type: string
        description: "Good repute form key"
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
*/
SELECT
  id AS snapshot_id,
  version,
  status,
  created_at,
  (SELECT first_name || ' ' || last_name FROM users.user_account WHERE user_account.personal_code = created_by ORDER BY user_account.id DESC LIMIT 1) AS created_by,
  (SELECT organisation_name FROM users.user_account WHERE user_account.personal_code = created_by ORDER BY user_account.id DESC LIMIT 1) AS org_name
FROM forms.good_repute_form
WHERE good_repute_form_key = :id::BIGINT
ORDER BY created_at;
