/*
declaration:
  version: 0.1
  description: "Get version history snapshots for a transport-interruption form"
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: id
        type: string
        description: "KV form key"
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
WITH ranked AS (
  SELECT
    id,
    kv_form_key,
    sub_form_number,
    version,
    status,
    created_at,
    created_by,
    LEAD(status) OVER (
      PARTITION BY kv_form_key
      ORDER BY created_at ASC
    ) AS next_status
  FROM forms.kv_form
  WHERE kv_form_key = :id::BIGINT
),
filtered AS (
  SELECT
    id AS snapshot_id,
    version,
    sub_form_number,
    status,
    created_at,
    created_by
  FROM ranked
  WHERE status != 'saved' OR next_status IS DISTINCT FROM status
)
SELECT
  snapshot_id,
  version,
  status,
  created_at,
  (SELECT first_name || ' ' || last_name FROM users.user_account WHERE user_account.personal_code = filtered.created_by ORDER BY user_account.id DESC LIMIT 1) AS created_by,
  (SELECT organisation_name FROM users.user_account WHERE user_account.personal_code = filtered.created_by ORDER BY user_account.id DESC LIMIT 1) AS org_name
FROM filtered
ORDER BY created_at;
