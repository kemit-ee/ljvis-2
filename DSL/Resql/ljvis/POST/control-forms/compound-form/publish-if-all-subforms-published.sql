/*
description: 'Avalikustab kinnitatud koondvormi süsteemi nimel, kui selle kõik olemasolevad ja
  kustutamata alamvormid on avalikustatud. Lisab uue koondvormi snapshoti ja on idempotentne.'
namespace: control-forms
params:
  key:
    type: integer
    required: false
  created_by:
    type: string
    required: false
returns:
- name: id
  type: number
  nullable: true
- name: formNumber
  type: string
  nullable: true
- name: version
  type: number
  nullable: true
*/
WITH latest_compound AS (
  SELECT * FROM forms.compound_form
  WHERE compound_form_key = :key::BIGINT
  ORDER BY revision DESC LIMIT 1
),
latest_subforms AS (
  SELECT status FROM (
    SELECT DISTINCT ON (sp_driver_form_key) compound_form_key, status
    FROM forms.sp_driver_form WHERE compound_form_key = :key::BIGINT
    ORDER BY sp_driver_form_key, revision DESC
  ) x WHERE status <> 'deleted'
  UNION ALL
  SELECT status FROM (
    SELECT DISTINCT ON (sp_teammate_form_key) compound_form_key, status
    FROM forms.sp_teammate_form WHERE compound_form_key = :key::BIGINT
    ORDER BY sp_teammate_form_key, revision DESC
  ) x WHERE status <> 'deleted'
  UNION ALL
  SELECT status FROM (
    SELECT DISTINCT ON (vehicle_technical_form_key) compound_form_key, status
    FROM forms.vehicle_technical_form WHERE compound_form_key = :key::BIGINT
    ORDER BY vehicle_technical_form_key, revision DESC
  ) x WHERE status <> 'deleted'
  UNION ALL
  SELECT status FROM (
    SELECT DISTINCT ON (trailer_technical_form_key) compound_form_key, status
    FROM forms.trailer_technical_form WHERE compound_form_key = :key::BIGINT
    ORDER BY trailer_technical_form_key, revision DESC
  ) x WHERE status <> 'deleted'
  UNION ALL
  SELECT status FROM (
    SELECT DISTINCT ON (adr_form_key) compound_form_key, status
    FROM forms.adr_form WHERE compound_form_key = :key::BIGINT
    ORDER BY adr_form_key, revision DESC
  ) x WHERE status <> 'deleted'
  UNION ALL
  SELECT status FROM (
    SELECT DISTINCT ON (kv_form_key) compound_form_key, status
    FROM forms.kv_form WHERE compound_form_key = :key::BIGINT
    ORDER BY kv_form_key, revision DESC
  ) x WHERE status <> 'deleted'
)
INSERT INTO forms.compound_form
SELECT (jsonb_populate_record(
  NULL::forms.compound_form,
  to_jsonb(c) || jsonb_build_object(
    'id', nextval(pg_get_serial_sequence('forms.compound_form', 'id')),
    'revision', c.revision + 1,
    'status', 'published',
    'created_at', now(),
    'created_by', COALESCE(NULLIF(:created_by, ''), 'LJVIS-CRON')
  )
)).*
FROM latest_compound c
WHERE c.status = 'confirmed'
  AND EXISTS (SELECT 1 FROM latest_subforms)
  AND NOT EXISTS (SELECT 1 FROM latest_subforms WHERE status <> 'published')
RETURNING compound_form_key AS id, form_number AS "formNumber", version;
