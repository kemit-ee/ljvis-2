/*
declaration:
  version: 0.1
  description: "Get version history snapshots for a foreign violation form"
  method: get
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: id
        type: string
        description: "Foreign violation form ID"
  response:
    fields:
      - field: snapshot_id
        type: number
      - field: version
        type: string
      - field: status
        type: string
      - field: created_at
        type: string
      - field: created_by
        type: string
*/
WITH ranked AS (
  SELECT
    id,
    foreign_violation_form_key,
    form_number,
    status,
    created_at,
    created_by,
    ROW_NUMBER() OVER (
      PARTITION BY foreign_violation_form_key, status
      ORDER BY created_at DESC
    ) AS rn_per_status,
    ROW_NUMBER() OVER (
      PARTITION BY foreign_violation_form_key
      ORDER BY created_at DESC
    ) AS rn_overall
  FROM forms.foreign_violation_form
  WHERE foreign_violation_form_key = :id::BIGINT
),
filtered AS (
  SELECT
    id AS snapshot_id,
    foreign_violation_form_key,
    form_number,
    status,
    created_at,
    created_by
  FROM ranked
  WHERE status != 'saved' OR rn_per_status = 1
)
SELECT
  snapshot_id,
  SPLIT_PART(form_number, '/', 2)::integer AS version,
  status,
  created_at,
  (SELECT first_name || ' ' || last_name FROM users.user_account WHERE user_account.personal_code = created_by ORDER BY user_account.id DESC LIMIT 1) AS created_by,
  (SELECT organisation_name FROM users.user_account WHERE user_account.personal_code = created_by ORDER BY user_account.id DESC LIMIT 1) AS org_name
FROM filtered
ORDER BY created_at;
