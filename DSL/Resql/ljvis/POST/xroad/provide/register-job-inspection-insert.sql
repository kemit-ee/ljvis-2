/*
declaration:
  version: 0.1
  description: >-
    X-tee RegisterJobInspection v1: INSERT INTO forms.labour_inspection_form.
    Kaardistab vana WSDL RegisterJobInspectionRequestType välju.
    Idempotentsuse võti: external_inspection_id (kontrolli_id stringina).
    ON CONFLICT DO NOTHING: korduspäring sama id-ga ei tekita duplikaati.
    inspection_type tuletab YAML (passenger/cargo).
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

-- Idempotentsuse kontroll: kui sama external_inspection_id on juba olemas, tagasta 0 rida (YAML käsitleb edukana)
WITH existing AS (
  SELECT labour_inspection_form_key, form_number, 1 AS version
  FROM forms.labour_inspection_form
  WHERE external_inspection_id = :externalInspectionId
  ORDER BY created_at DESC
  LIMIT 1
),
ins AS (
  INSERT INTO forms.labour_inspection_form (
    labour_inspection_form_key,
    form_number,
    version,
    status,
    inspector_name,
    inspection_date,
    inspection_type,
    company_name,
    company_reg_code,
    vehicle_count,
    controls_matrix,
    prescription_composed,
    violations,
    external_inspection_id,
    proceeding_reference_number,
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
    COALESCE(NULLIF(:controlsMatrix, ''), '[]')::JSONB,
    CASE WHEN :prescriptionComposed IN ('true', '1', 'yes') THEN true ELSE false END,
    COALESCE(NULLIF(:violations, ''), '[]')::JSONB,
    :externalInspectionId,
    NULLIF(:proceedingReferenceNumber, ''),
    :created_by
  WHERE NOT EXISTS (SELECT 1 FROM existing)
  RETURNING labour_inspection_form_key AS id, form_number, version
)
SELECT id, form_number, version, false AS skipped FROM ins
UNION ALL
SELECT labour_inspection_form_key AS id, form_number, version, true AS skipped FROM existing
LIMIT 1;
