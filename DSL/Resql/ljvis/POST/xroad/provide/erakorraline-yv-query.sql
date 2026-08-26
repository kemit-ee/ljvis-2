/*
description: "X-tee ErakorralineYVquery (v1): tagastab ajavahemikul erakorralisele tehnoülevaatusele suunatud sõidukid. Filtrid: result_type IN ('extraordinary_inspection', 'extraordinary_inspection_ta'), compound_form.control_date BETWEEN alates AND kuni, vehicle_country_code IS NULL OR 'EE'. Kaasab parts_defects JSONB ja era_yv_mnt_* flagid, mille YAML kaardistab vastuse formaati."
namespace: xroad
params:
  alates:
    type: string
    required: false
  kuni:
    type: string
    required: false
returns:
  - name: licence_plate_no
    type: string
    nullable: true
  - name: trailer_no
    type: string
    nullable: true
  - name: inspection_id
    type: string
    nullable: true
  - name: inspection_no
    type: string
    nullable: true
  - name: inspection_date
    type: string
    nullable: true
  - name: inspection_type
    type: string
    nullable: true
  - name: inspection_unit
    type: string
    nullable: true
  - name: inspection_notes
    type: string
    nullable: true
  - name: inspector
    type: string
    nullable: true
  - name: issues_json
    type: string
    nullable: true
  - name: era_yv_mnt_regnr
    type: boolean
    nullable: true
  - name: era_yv_mnt_vintin
    type: boolean
    nullable: true
  - name: era_yv_mnt_axles
    type: boolean
    nullable: true
  - name: era_yv_mnt_places
    type: boolean
    nullable: true
  - name: era_yv_mnt_rebuilt
    type: boolean
    nullable: true
*/

WITH latest_vtf AS (
  -- Viimane snapshot iga tehnoülevaatuse vormi kohta
  -- DISTINCT ON + ORDER BY created_at DESC = ainult uusim versioon
  SELECT DISTINCT ON (vtf.vehicle_technical_form_key)
    vtf.vehicle_technical_form_key,
    vtf.compound_form_key,
    vtf.result_type,
    vtf.notes,
    vtf.parts_defects::TEXT            AS issues_json,   -- YAML teisendab JSON objektideks
    vtf.era_yv_mnt_regnr,     -- kas registreerimisnumbri muutmine on vajalik
    vtf.era_yv_mnt_vintin,    -- kas VIN/TIN muutmine on vajalik
    vtf.era_yv_mnt_axles,     -- kas telgede arvu muutmine on vajalik
    vtf.era_yv_mnt_places,    -- kas kohtade arvu muutmine on vajalik
    vtf.era_yv_mnt_rebuilt    -- kas ümberehituse märge on vajalik
  FROM forms.vehicle_technical_form vtf
  -- Filtreeri ainult erakorralise tehnoülevaatusega seotud tulemused
  WHERE vtf.result_type IN ('extraordinary_inspection', 'extraordinary_inspection_ta')
    AND vtf.status <> 'deleted'   -- kustutatud vormid välja
  ORDER BY vtf.vehicle_technical_form_key, vtf.created_at DESC
),
latest_compound AS (
  -- Viimane snapshot iga koondvormi kohta (kuupäeva ja sõiduki andmete saamiseks)
  SELECT DISTINCT ON (cf.compound_form_key)
    cf.compound_form_key,
    cf.control_date,
    cf.form_number,
    cf.vehicle_reg_nr,
    cf.company_name,
    cf.vehicle_country_code   -- ainult Eesti sõidukid (EE või NULL)
  FROM forms.compound_form cf
  WHERE cf.status <> 'deleted'
  ORDER BY cf.compound_form_key, cf.created_at DESC
)
SELECT
  lc.vehicle_reg_nr                             AS licence_plate_no,
  NULL::TEXT                                    AS trailer_no,            -- haagist LJVIS ei salvesta
  vtf.vehicle_technical_form_key::TEXT          AS inspection_id,         -- X-tee viiteID kinnitamiseks
  lc.form_number                                AS inspection_no,
  lc.control_date::TEXT                         AS inspection_date,
  vtf.result_type                               AS inspection_type,
  lc.company_name                               AS inspection_unit,       -- kontrolli teinud asutus
  vtf.notes                                     AS inspection_notes,
  NULL::TEXT                                    AS inspector,             -- üksiku kontrollija andmed puuduvad
  vtf.issues_json,                              -- rikked JSON-na, YAML parsib
  vtf.era_yv_mnt_regnr,
  vtf.era_yv_mnt_vintin,
  vtf.era_yv_mnt_axles,
  vtf.era_yv_mnt_places,
  vtf.era_yv_mnt_rebuilt
FROM latest_vtf vtf
JOIN latest_compound lc ON lc.compound_form_key = vtf.compound_form_key
-- Ajavahemiku filter — mõlemad piirid on kaasavad (BETWEEN)
WHERE lc.control_date BETWEEN :alates::DATE AND :kuni::DATE
  -- Ainult Eesti sõidukid (välisriigi sõidukid jäetakse välja)
  AND (lc.vehicle_country_code IS NULL OR lc.vehicle_country_code = 'EE')
ORDER BY lc.control_date DESC, vtf.vehicle_technical_form_key;
