/*
declaration:
  version: 0.1
  description: "Update labour inspection form (Tööinspektsiooni kontrollakt) — appends a new snapshot row; also used by confirm/re-save"
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: key
        type: string
      - field: formNumber
        type: string
      - field: status
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
      - field: totalDriversCount
        type: string
      - field: controlsMatrix
        type: string
      - field: prescriptionComposed
        type: string
      - field: punishedPersonIdCode
        type: string
      - field: punishedPersonFirstName
        type: string
      - field: punishedPersonLastName
        type: string
      - field: proceedingReferenceNumber
        type: string
      - field: violations
        type: string
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
      - field: form_number
        type: string
*/
INSERT INTO forms.labour_inspection_form (
  labour_inspection_form_key,
  form_number,
  status,
  inspector_name,
  inspection_date,
  inspection_type,
  company_name,
  company_reg_code,
  vehicle_count,
  total_drivers_count,
  controls_matrix,
  prescription_composed,
  punished_person_id_code,
  punished_person_first_name,
  punished_person_last_name,
  proceeding_reference_number,
  violations,
  created_by
)
VALUES (
  :key::BIGINT,
  :formNumber,
  :status,
  :inspectorName,
  :inspectionDate::DATE,
  :inspectionType,
  :companyName,
  :companyRegCode,
  NULLIF(:vehicleCount, '')::INTEGER,
  NULLIF(:totalDriversCount, '')::INTEGER,
  COALESCE(NULLIF(:controlsMatrix, ''), '[]')::JSONB,
  CASE WHEN :prescriptionComposed IN ('true', '1', 'yes') THEN true ELSE false END,
  NULLIF(:punishedPersonIdCode, ''),
  NULLIF(:punishedPersonFirstName, ''),
  NULLIF(:punishedPersonLastName, ''),
  NULLIF(:proceedingReferenceNumber, ''),
  COALESCE(NULLIF(:violations, ''), '[]')::JSONB,
  :created_by
)
RETURNING labour_inspection_form_key AS id, form_number;
