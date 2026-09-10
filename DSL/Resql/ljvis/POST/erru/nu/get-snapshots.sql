/*
description: "List the history of an NU message."
namespace: erru
params:
  id:
    type: integer
    required: false
returns:
- name: snapshot_id
  type: string
  nullable: false
- name: version
  type: number
  nullable: false
- name: created_at
  type: string
  nullable: false
- name: created_by
  type: string
  nullable: false
- name: org_name
  type: string
  nullable: true
- name: status
  type: string
  nullable: false
*/
SELECT
  n.id::TEXT AS snapshot_id,
  n.version,
  n.created_at,
  COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), n.created_by) AS created_by,
  u.organisation_name AS org_name,
  n.status
FROM erru.nu_message n
LEFT JOIN LATERAL (
  SELECT first_name, last_name, organisation_name
  FROM users.user_account
  WHERE personal_code = n.created_by
  ORDER BY id DESC
  LIMIT 1
) u ON TRUE
WHERE n.nu_message_key = :id::BIGINT
ORDER BY n.created_at, n.id;
