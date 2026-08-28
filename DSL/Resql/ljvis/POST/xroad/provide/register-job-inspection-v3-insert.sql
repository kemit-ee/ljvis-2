/*
declaration:
  version: 0.1
  description: >-
    X-tee RegisterJobInspection_v3: INSERT INTO forms.labour_inspection_form.
    Uuem leping — lisaks v1 väljadele: sõiduki andmed controls_matrix JSONB-s,
    juhi isikukood ja nimi, menetluse liik.
    Idempotentsuse võti: external_inspection_id = 'v3-' || kontrolli_id.
    ON CONFLICT DO NOTHING: korduspäring sama id-ga ei tekita duplikaati.
  method: post
  accepts: json
  returns: json
  namespace: xroad
  allowlist:
    body:
      - field: externalInspectionId
        type: string
      - field: inspectorName
        type: string
      - field: inspectionDate
        type: string
      - field: inspectionType
        type: string
      - field: companyName
        type: string
      - field: companyRegCode
        type: string
      - field: vehicleCount
        type: string
      - field: prescriptionComposed
        type: string
      - field: controlsMatrix
        type: string
      - field: violations
        type: string
      - field: punishedPersonIdCode
        type: string
      - field: punishedPersonFirstName
        type: string
      - field: punishedPersonLastName
        type: string
      - field: proceedingReferenceNumber
        type: string
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
      - field: form_number
        type: string
      - field: version
        type: number
      - field: skipped
        type: boolean
*/

-- Idempotentsuse kontroll: 'v3-' prefiksiga external_inspection_id eristab v1 kirjetest
-- Sama v3 kontrolli_id kordussaatmine tagastab olemasoleva rea (skipped=true)
WITH existing AS (
  SELECT labour_inspection_form_key, form_number, 1 AS version
  FROM forms.labour_inspection_form
  WHERE external_inspection_id = :externalInspectionId   -- sisaldab juba 'v3-' prefiksit
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
    controls_matrix,       -- v3 lisaväljad: v2_soiduki_reg_nr, v2_soiduki_vin, v2_menetluse_liik
    prescription_composed,
    violations,
    external_inspection_id,         -- 'v3-' + kontrolli_id
    punished_person_id_code,        -- v3 lisandus: juhi isikukood
    punished_person_first_name,     -- v3 lisandus: juhi eesnimi
    punished_person_last_name,      -- v3 lisandus: juhi perekonnanimi
    proceeding_reference_number,    -- v3: menetluse number
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
    -- controls_matrix sisaldab nii v1 kontrollimised-andmeid kui v3 sõiduki lisaandmeid
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
