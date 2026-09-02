/*
declaration:
  version: 0.1
  description: >-
    Candidates for the hourly yvkehtivus sync (LJVIS2-135/58/23): latest
    snapshot of each confirmed vehicle technical-check sub-form directed
    to extraordinary inspection (result_type IN
    extraordinary_inspection/extraordinary_inspection_ta) that hasn't
    passed it yet (extraordinary_inspection_date IS NULL), joined to its
    parent compound_form's vehicle identity (registration number / VIN).
    Both `latest_vtf` and `latest_cf` resolve one row per key before any
    filtering, same reason as select_etoimik_candidates.sql.
    Capped at 365 days since the sub-form snapshot was created (LJVIS2-135,
    Eda Rembel comment 09.07.2026: liiklusregister is queried repeatedly
    but not for more than 365 days). The spec doesn't pin down the exact
    reference date for that cap; this uses the sub-form's created_at —
    revisit if a more authoritative reference (e.g. the driving-ban date)
    turns up.
    Rows drop out once update-extraordinary-inspection-date.sql writes the
    date, which makes the hourly job idempotent.
    Only vehicle_technical_form — trailer_technical_form is not covered:
    a compound_form can carry up to 3 trailers in its `trailers` JSONB
    array, and trailer_technical_form has no column identifying which one
    a given snapshot belongs to.
  method: post
  namespace: control-forms
  returns: json
  response:
    fields:
      - field: id
        type: number
      - field: registrationNumber
        type: string
      - field: vin
        type: string
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
latest_cf AS (
    SELECT DISTINCT ON (compound_form_key)
        compound_form_key,
        vehicle_reg_nr,
        vehicle_vin
    FROM forms.compound_form
    ORDER BY compound_form_key, created_at DESC
)
SELECT
    v.id,
    COALESCE(c.vehicle_reg_nr, '') AS registration_number,
    COALESCE(c.vehicle_vin, '') AS vin
FROM latest_vtf v
JOIN latest_cf c ON c.compound_form_key = v.compound_form_key
WHERE v.status = 'confirmed'
  AND v.result_type IN ('extraordinary_inspection', 'extraordinary_inspection_ta')
  AND v.extraordinary_inspection_date IS NULL
  AND v.created_at >= now() - INTERVAL '365 days'
  AND (COALESCE(c.vehicle_reg_nr, '') <> '' OR COALESCE(c.vehicle_vin, '') <> '');
