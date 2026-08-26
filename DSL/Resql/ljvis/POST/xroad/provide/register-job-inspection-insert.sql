/*
description: "X-tee RegisterJobInspection v1: INSERT INTO forms.labour_inspection_form. Kaardistab vana WSDL RegisterJobInspectionRequestType välju. Idempotentsuse võti: external_inspection_id (kontrolli_id stringina). ON CONFLICT DO NOTHING: korduspäring sama id-ga ei tekita duplikaati. inspection_type tuletab YAML (passenger/cargo)."
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

-- Idempotentsuse kontroll: kas sama external_inspection_id on juba olemas?
-- Kui jah, tagastatakse olemasolev rida (skipped=true) ilma duplikaadi loomiseta
WITH existing AS (
  SELECT labour_inspection_form_key, form_number, 1 AS version
  FROM forms.labour_inspection_form
  WHERE external_inspection_id = :externalInspectionId
  ORDER BY created_at DESC
  LIMIT 1
),
-- Uue rea sisestamine — ainult siis kui sama ID puudub
ins AS (
  INSERT INTO forms.labour_inspection_form (
    labour_inspection_form_key,
    form_number,       -- automaatselt genereeritud 'ti-YYYY-NNNNN' formaadis
    version,
    status,            -- uus kirje alustab 'saved' staatusest
    inspector_name,
    inspection_date,
    inspection_type,   -- YAML tuletab: 'passenger' kui soitjate veol, muul juhul 'cargo'
    company_name,
    company_reg_code,
    vehicle_count,
    controls_matrix,   -- KontrollimisteArvud JSONB-na
    prescription_composed,
    violations,        -- RikkumisteArvud JSONB-na
    external_inspection_id,   -- WSDL kontrolli_id — idempotentsuse võti
    proceeding_reference_number,
    created_by
  )
  SELECT
    nextval('forms.seq_labour_inspection_form_key'),
    -- Vormi number: 'ti-' + aasta + '-' + järjekord (5 numbrit, nullidega täidetud)
    'ti-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(currval('forms.seq_labour_inspection_form_key')::TEXT, 5, '0'),
    1,
    'saved',
    :inspectorName,
    :inspectionDate::DATE,
    :inspectionType,
    :companyName,
    :companyRegCode,
    NULLIF(:vehicleCount, '')::INTEGER,   -- tühi string -> NULL
    COALESCE(NULLIF(:controlsMatrix, ''), '[]')::JSONB,
    -- boolean teisendus: 'true', '1' või 'yes' -> true, muul juhul false
    CASE WHEN :prescriptionComposed IN ('true', '1', 'yes') THEN true ELSE false END,
    COALESCE(NULLIF(:violations, ''), '[]')::JSONB,
    :externalInspectionId,
    NULLIF(:proceedingReferenceNumber, ''),
    :created_by
  WHERE NOT EXISTS (SELECT 1 FROM existing)   -- INSERT ainult kui sama ID puudub
  RETURNING labour_inspection_form_key AS id, form_number, version
)
-- Tagasta uus rida (skipped=false) VÕI olemasolev rida (skipped=true)
SELECT id, form_number, version, false AS skipped FROM ins
UNION ALL
SELECT labour_inspection_form_key AS id, form_number, version, true AS skipped FROM existing
LIMIT 1;   -- alati täpselt üks rida
