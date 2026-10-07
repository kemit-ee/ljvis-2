/*
description: 'Candidates for the hourly yvkehtivus sync (LJVIS2-135/58/23): latest snapshot of each confirmed
  vehicle technical-check sub-form directed to extraordinary inspection (result_type IN extraordinary_inspection/extraordinary_inspection_ta)
  that hasn''t passed it yet (extraordinary_inspection_date IS NULL), joined to its parent compound_form''s
  vehicle identity (registration number / VIN). Both `latest_vtf` and `latest_cf` resolve one row per
  key before any filtering, same reason as select_etoimik_candidates.sql. Capped at 365 days since the
  sub-form snapshot was created (LJVIS2-135, Eda Rembel comment 09.07.2026: liiklusregister is queried
  repeatedly but not for more than 365 days). The spec doesn''t pin down the exact reference date for
  that cap; this uses the sub-form''s created_at — revisit if a more authoritative reference (e.g. the
  driving-ban date) turns up. Rows drop out once update-extraordinary-inspection-date.sql writes the date,
  which makes the hourly job idempotent. Only vehicle_technical_form — trailer_technical_form has its own
  mirror query (trailer-technical/select_yvkehtivus_candidates.sql, 15 ettepanekut p15), using
  trailer_technical_form.trailer_reg_nr (added 20260826110000) to identify which of up to 3 trailers in
  the compound_form''s `trailers` JSONB array a given snapshot belongs to.'
namespace: control-forms
params: {}
returns:
- name: id
  type: number
  nullable: true
- name: registrationNumber
  type: string
  nullable: true
- name: vin
  type: string
  nullable: true
*/
WITH latest_vtf AS (
    SELECT DISTINCT ON (vehicle_technical_form_key)
        vehicle_technical_form_key AS id,
        compound_form_key,
        status,
        result_type,
        extraordinary_inspection_date,
        created_at
    FROM forms.vehicle_technical_form
    ORDER BY vehicle_technical_form_key, created_at DESC
),
cand AS (
    SELECT v.id, v.compound_form_key
    FROM latest_vtf v
    WHERE v.status = 'confirmed'
      AND v.result_type IN ('extraordinary_inspection', 'extraordinary_inspection_ta')
      AND v.extraordinary_inspection_date IS NULL
      AND v.created_at >= now() - INTERVAL '365 days'
),
resolved AS (
    SELECT cand.id,
           (SELECT c FROM forms.compound_form c WHERE c.compound_form_key = cand.compound_form_key ORDER BY c.created_at DESC LIMIT 1) AS cf
    FROM cand
)
SELECT
    id,
    COALESCE((cf).vehicle_reg_nr, '') AS registration_number,
    COALESCE((cf).vehicle_vin, '') AS vin
FROM resolved
WHERE COALESCE((cf).vehicle_reg_nr, '') <> '' OR COALESCE((cf).vehicle_vin, '') <> '';
