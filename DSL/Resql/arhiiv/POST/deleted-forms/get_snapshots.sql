/*
description: 'ADR-010: kustutatud (arhiveeritud) kontrollvormi versiooniajalugu arhiiv-andmebaasist.
  Sama väljundikuju mis töö-baasi control-forms/<form>/get-snapshots.sql — Ruuteri fallback kutsub seda,
  kui töö-baas tagastab 0 rida. Looja nimi + org on juba copy-ajal resolutsiooniga (arhiiv-baasis
  users.user_account puudub).'
namespace: deleted-forms
params:
  formType:
    type: string
    required: false
    description: "'compound-form','tram-card','labour-inspection', ..."
  formKey:
    type: integer
    required: false
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
    id, version, status, created_at, created_by_name, org_name,
    LEAD(status) OVER (PARTITION BY form_key ORDER BY created_at ASC) AS next_status
  FROM archive.form_snapshot
  WHERE form_type = :formType
    AND form_key = :formKey::BIGINT
)
SELECT
  id AS snapshot_id,
  version,
  status,
  created_at,
  created_by_name AS created_by,
  org_name
FROM ranked
WHERE status != 'saved' OR next_status IS DISTINCT FROM status
ORDER BY created_at;
