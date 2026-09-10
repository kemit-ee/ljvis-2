/*
description: Version history snapshots for a TRAM control card.
namespace: control-forms
params:
  id:
    type: integer
    required: false
    description: tram_control_card_key
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
    tram_control_card_key,
    version,
    status,
    created_at,
    created_by,
    LEAD(status) OVER (
      PARTITION BY tram_control_card_key
      ORDER BY created_at ASC
    ) AS next_status
  FROM forms.tram_control_card
  WHERE tram_control_card_key = :id::BIGINT
),
filtered AS (
  SELECT
    id AS snapshot_id,
    version,
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
  COALESCE(
    (SELECT first_name || ' ' || last_name FROM users.user_account WHERE user_account.personal_code = filtered.created_by ORDER BY user_account.id DESC LIMIT 1),
    filtered.created_by
  ) AS created_by,
  (SELECT organisation_name FROM users.user_account WHERE user_account.personal_code = filtered.created_by ORDER BY user_account.id DESC LIMIT 1) AS org_name
FROM filtered
ORDER BY created_at;
