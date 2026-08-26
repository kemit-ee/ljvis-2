/*
description: "Get version history snapshots for a transport-interruption form"
namespace: control-forms
params:
  id:
    type: string
    required: false
    description: "KV form key"
returns:
  - name: snapshot_id
    type: number
    nullable: true
  - name: version
    type: number
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
  - name: org_name
    type: string
    nullable: true
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
