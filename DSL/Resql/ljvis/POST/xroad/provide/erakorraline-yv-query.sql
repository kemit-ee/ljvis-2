/*
declaration:
  version: 0.1
  description: >-
    X-tee ErakorralineYVquery (v1): tagastab ajavahemikul erakorralisele
    tehnoülevaatusele suunatud sõidukid. Filtrid: result_type IN
    ('extraordinary_inspection', 'extraordinary_inspection_ta'),
    compound_form.control_date BETWEEN alates AND kuni,
    vehicle_country_code IS NULL OR 'EE'. Kaasab parts_defects JSONB
    ja era_yv_mnt_* flagid, mille YAML kaardistab vastuse formaati.
  method: post
  accepts: json
  returns: json
  namespace: xroad
  allowlist:
    body:
      - field: alates
        type: string
      - field: kuni
        type: string
  response:
    fields:
      - field: licence_plate_no
        type: string
      - field: trailer_no
        type: string
      - field: inspection_id
        type: string
      - field: inspection_no
        type: string
      - field: inspection_date
        type: string
      - field: inspection_type
        type: string
      - field: inspection_unit
        type: string
      - field: inspection_notes
        type: string
      - field: inspector
        type: string
      - field: issues_json
        type: string
      - field: era_yv_mnt_regnr
        type: boolean
      - field: era_yv_mnt_vintin
        type: boolean
      - field: era_yv_mnt_axles
        type: boolean
      - field: era_yv_mnt_places
        type: boolean
      - field: era_yv_mnt_rebuilt
        type: boolean
*/

WITH latest_vtf AS (
  -- Viimane snapshot iga vehicle_technical_form kohta
  SELECT DISTINCT ON (vtf.vehicle_technical_form_key)
    vtf.vehicle_technical_form_key,
    vtf.compound_form_key,
    vtf.result_type,
    vtf.notes,
    vtf.parts_defects::TEXT            AS issues_json,
    vtf.era_yv_mnt_regnr,
    vtf.era_yv_mnt_vintin,
    vtf.era_yv_mnt_axles,
    vtf.era_yv_mnt_places,
    vtf.era_yv_mnt_rebuilt
  FROM forms.vehicle_technical_form vtf
  WHERE vtf.result_type IN ('extraordinary_inspection', 'extraordinary_inspection_ta')
    AND vtf.status <> 'deleted'
  ORDER BY vtf.vehicle_technical_form_key, vtf.created_at DESC
),
latest_compound AS (
  -- Viimane snapshot iga koondvormi kohta
  SELECT DISTINCT ON (cf.compound_form_key)
    cf.compound_form_key,
    cf.control_date,
    cf.form_number,
    cf.vehicle_reg_nr,
    cf.company_name,
    cf.vehicle_country_code
  FROM forms.compound_form cf
  WHERE cf.status <> 'deleted'
  ORDER BY cf.compound_form_key, cf.created_at DESC
)
SELECT
  lc.vehicle_reg_nr                             AS licence_plate_no,
  NULL::TEXT                                    AS trailer_no,
  vtf.vehicle_technical_form_key::TEXT          AS inspection_id,
  lc.form_number                                AS inspection_no,
  lc.control_date::TEXT                         AS inspection_date,
  vtf.result_type                               AS inspection_type,
  lc.company_name                               AS inspection_unit,
  vtf.notes                                     AS inspection_notes,
  NULL::TEXT                                    AS inspector,
  vtf.issues_json,
  vtf.era_yv_mnt_regnr,
  vtf.era_yv_mnt_vintin,
  vtf.era_yv_mnt_axles,
  vtf.era_yv_mnt_places,
  vtf.era_yv_mnt_rebuilt
FROM latest_vtf vtf
JOIN latest_compound lc ON lc.compound_form_key = vtf.compound_form_key
WHERE lc.control_date BETWEEN :alates::DATE AND :kuni::DATE
  AND (lc.vehicle_country_code IS NULL OR lc.vehicle_country_code = 'EE')
ORDER BY lc.control_date DESC, vtf.vehicle_technical_form_key;
