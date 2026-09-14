/*
description: 'Candidates for the hourly yvkehtivus sync (LJVIS2-135/58/23), trailer variant (15 ettepanekut
  p15): latest snapshot of each confirmed trailer technical-check sub-form directed to extraordinary
  inspection that hasn''t passed it yet, joined to the SPECIFIC trailer entry in its parent compound_form''s
  `trailers` JSONB array (matched by trailer_reg_nr — added in 20260826110000 specifically so a sub-form
  snapshot could be tied back to one of up to 3 trailers). Mirrors vehicle-technical/select_yvkehtivus_candidates.sql;
  both `latest_ttf` and `latest_cf` resolve one row per key before any filtering, same reason as that
  file''s comment. Capped at 365 days since the sub-form snapshot was created (same LJVIS2-135 rule).
  Rows drop out once update-extraordinary-inspection-date.sql writes the date, which makes the hourly
  job idempotent.'
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
WITH latest_ttf AS (
    SELECT DISTINCT ON (trailer_technical_form_key)
        trailer_technical_form_key AS id,
        compound_form_key,
        status,
        result_type,
        extraordinary_inspection_date,
        trailer_reg_nr,
        created_at
    FROM forms.trailer_technical_form
    ORDER BY trailer_technical_form_key, created_at DESC
),
latest_cf AS (
    SELECT DISTINCT ON (compound_form_key)
        compound_form_key,
        trailers
    FROM forms.compound_form
    ORDER BY compound_form_key, created_at DESC
),
-- Flatten the trailers[] JSONB array so each candidate can be matched to
-- its own trailer by registration number, not just any trailer on the koondvorm.
matched_trailer AS (
    SELECT
        c.compound_form_key,
        upper(btrim(elem ->> 'reg_nr')) AS reg_nr,
        elem ->> 'vin' AS vin
    FROM latest_cf c
    CROSS JOIN LATERAL jsonb_array_elements(c.trailers) AS elem
)
SELECT
    t.id,
    -- The sub-form's own trailer_reg_nr is authoritative for the XTR query
    -- (it's what the officer entered on THIS snapshot) — matched_trailer is
    -- only consulted for the VIN, which trailer_reg_nr alone doesn't carry.
    COALESCE(upper(btrim(t.trailer_reg_nr)), '') AS registration_number,
    COALESCE(m.vin, '') AS vin
FROM latest_ttf t
LEFT JOIN matched_trailer m
    ON m.compound_form_key = t.compound_form_key
   AND m.reg_nr = upper(btrim(t.trailer_reg_nr))
WHERE t.status = 'confirmed'
  AND t.result_type IN ('extraordinary_inspection', 'extraordinary_inspection_ta')
  AND t.extraordinary_inspection_date IS NULL
  AND t.created_at >= now() - INTERVAL '365 days'
  AND btrim(coalesce(t.trailer_reg_nr, '')) <> '';
