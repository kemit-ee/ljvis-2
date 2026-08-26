/*
description: "Get version history snapshots for a compound form"
namespace: control-forms
params:
  id:
    type: number
    required: false
    description: "Compound form ID"
returns:
  - name: snapshot_id
    type: number
    nullable: true
  - name: version
    type: string
    nullable: true
  - name: status
    type: string
    nullable: true
  - name: created_at
    type: string
    nullable: true
  - name: created_by
    type: string
    nullable: true
*/
WITH ranked AS (
  SELECT
    id,
    compound_form_key,
    form_number,
    status,
    created_at,
    created_by,
    LEAD(status) OVER (
      PARTITION BY compound_form_key
      ORDER BY created_at ASC
    ) AS next_status
  FROM forms.compound_form
  WHERE compound_form_key = :id::BIGINT
),
filtered AS (
  SELECT
    id AS snapshot_id,
    compound_form_key,
    form_number,
    status,
    created_at,
    created_by
  FROM ranked
  WHERE status != 'saved' OR next_status IS DISTINCT FROM status
)
SELECT
  snapshot_id,
  SPLIT_PART(form_number, '/', 2)::integer AS version,
  status,
  created_at,
  (SELECT first_name || ' ' || last_name FROM users.user_account WHERE user_account.personal_code = filtered.created_by ORDER BY user_account.id DESC LIMIT 1) AS created_by,
  (SELECT organisation_name FROM users.user_account WHERE user_account.personal_code = filtered.created_by ORDER BY user_account.id DESC LIMIT 1) AS org_name
FROM filtered
ORDER BY created_at;
