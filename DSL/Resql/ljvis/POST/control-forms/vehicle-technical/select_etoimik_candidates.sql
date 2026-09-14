/*
description: 'Candidates for the nightly e-toimik decision sync on vehicle technical-check sub-forms
  (LJVIS2-72 15 ettepanekut p9): latest snapshot of each confirmed sub-form with a väärteomenetlus
  reference number and no enforcement_decision yet, joined to its parent compound_form''s first driver
  (drivers[0]) Estonian personal code — same subject-of-the-decision assumption as
  drive-rest-form/driver/select_etoimik_candidates.sql. Both `latest_vtf` and `latest_cf` resolve one
  row per key before any filtering, same reason as that file''s comment. Rows drop out once
  update-xroad-fields.sql writes a decision, which makes the nightly job idempotent.'
namespace: control-forms
params: {}
returns:
- name: id
  type: number
  nullable: true
- name: proceeding_reference_number
  type: string
  nullable: true
- name: driver_personal_code
  type: string
  nullable: true
*/
WITH latest_vtf AS (
  SELECT DISTINCT ON (vehicle_technical_form_key)
      vehicle_technical_form_key AS id,
      compound_form_key,
      status,
      proceeding_type,
      proceeding_reference_number,
      enforcement_decision,
      created_at
  FROM forms.vehicle_technical_form
  ORDER BY vehicle_technical_form_key, created_at DESC
),
latest_cf AS (
  SELECT DISTINCT ON (compound_form_key)
      compound_form_key,
      drivers,
      authority
  FROM forms.compound_form
  ORDER BY compound_form_key, created_at DESC
)
SELECT
  v.id,
  v.proceeding_reference_number,
  (c.drivers -> 0 ->> 'personal_code_ee') AS driver_personal_code
FROM latest_vtf v
JOIN latest_cf c ON c.compound_form_key = v.compound_form_key
WHERE v.status = 'confirmed'
  AND c.authority = 'PPA'
  AND v.proceeding_type IS NOT NULL AND v.proceeding_type <> 'none'
  AND btrim(coalesce(v.proceeding_reference_number, '')) <> ''
  AND v.enforcement_decision IS NULL
  AND btrim(coalesce(c.drivers -> 0 ->> 'personal_code_ee', '')) <> ''
  AND v.created_at >= now() - INTERVAL '365 days';
