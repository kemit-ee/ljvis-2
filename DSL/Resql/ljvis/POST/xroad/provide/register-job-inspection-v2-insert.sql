/*
description: "X-tee RegisterJobInspection_v2: INSERT INTO forms.labour_inspection_form. Uuem leping — lisaks v1 väljadele: sõiduki andmed controls_matrix JSONB-s, juhi isikukood ja nimi, menetluse liik. Idempotentsuse võti: external_inspection_id = 'v2-' || kontrolli_id. ON CONFLICT DO NOTHING: korduspäring sama id-ga ei tekita duplikaati."
namespace: xroad
params:
  externalInspectionId:
    type: string
    required: false
  inspectorName:
    type: string
    required: false
  inspectionDate:
    type: string
    required: false
  inspectionType:
    type: string
    required: false
  companyName:
    type: string
    required: false
  companyRegCode:
    type: string
    required: false
  vehicleCount:
    type: string
    required: false
  prescriptionComposed:
    type: string
    required: false
  controlsMatrix:
    type: string
    required: false
  violations:
    type: string
    required: false
  punishedPersonIdCode:
    type: string
    required: false
  punishedPersonFirstName:
    type: string
    required: false
  punishedPersonLastName:
    type: string
    required: false
  proceedingReferenceNumber:
    type: string
    required: false
  created_by:
    type: string
    required: false
returns:
  - name: id
    type: number
    nullable: true
  - name: form_number
    type: string
    nullable: true
  - name: version
    type: number
    nullable: true
  - name: skipped
    type: boolean
    nullable: true
*/

-- Idempotentsuse kontroll: 'v2-' prefiksiga external_inspection_id eristab v1 kirjetest
-- Sama v2 kontrolli_id kordussaatmine tagastab olemasoleva rea (skipped=true)
WITH existing AS (
  SELECT labour_inspection_form_key, form_number, 1 AS version
  FROM forms.labour_inspection_form
  WHERE external_inspection_id = :externalInspectionId   -- sisaldab juba 'v2-' prefiksit
  ORDER BY created_at DESC
  LIMIT 1
),
-- Uue kirje lisamine — ainult kui sama ID puudub
ins AS (
  INSERT INTO forms.labour_inspection_form (
    labour_inspection_form_key,
    form_number,           -- 'ti-YYYY-NNNNN' formaadis
    version,
    status,                -- alustab 'saved' staatusest
    inspector_name,
    inspection_date,
    inspection_type,       -- 'passenger' / 'cargo' — YAML tuletab
    company_name,
    company_reg_code,
    vehicle_count,
    controls_matrix,       -- v2 lisaväljad: v2_soiduki_reg_nr, v2_soiduki_vin, v2_menetluse_liik
    prescription_composed,
    violations,
    external_inspection_id,         -- 'v2-' + kontrolli_id
    punished_person_id_code,        -- v2 lisandus: juhi isikukood
    punished_person_first_name,     -- v2 lisandus: juhi eesnimi
    punished_person_last_name,      -- v2 lisandus: juhi perekonnanimi
    proceeding_reference_number,    -- v2: menetluse number
    created_by
  )
  SELECT
    nextval('forms.seq_labour_inspection_form_key'),
    'ti-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(currval('forms.seq_labour_inspection_form_key')::TEXT, 5, '0'),
    1,
    'saved',
    :inspectorName,
    :inspectionDate::DATE,
    :inspectionType,
    :companyName,
    :companyRegCode,
    NULLIF(:vehicleCount, '')::INTEGER,
    -- controls_matrix sisaldab nii v1 kontrollimised-andmeid kui v2 sõiduki lisaandmeid
    COALESCE(NULLIF(:controlsMatrix, ''), '[]')::JSONB,
    CASE WHEN :prescriptionComposed IN ('true', '1', 'yes') THEN true ELSE false END,
    COALESCE(NULLIF(:violations, ''), '[]')::JSONB,
    :externalInspectionId,
    NULLIF(:punishedPersonIdCode, ''),      -- NULL kui juhi isikukood puudub
    NULLIF(:punishedPersonFirstName, ''),
    NULLIF(:punishedPersonLastName, ''),
    NULLIF(:proceedingReferenceNumber, ''),
    :created_by
  WHERE NOT EXISTS (SELECT 1 FROM existing)   -- INSERT ainult kui sama ID puudub
  RETURNING labour_inspection_form_key AS id, form_number, version
)
-- Tagasta kas uus (skipped=false) või olemasolev (skipped=true) kirje
SELECT id, form_number, version, false AS skipped FROM ins
UNION ALL
SELECT labour_inspection_form_key AS id, form_number, version, true AS skipped FROM existing
LIMIT 1;
