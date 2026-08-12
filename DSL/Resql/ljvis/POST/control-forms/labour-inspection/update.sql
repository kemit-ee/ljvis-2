/*
declaration:
  version: 0.1
  description: "Update labour inspection form (Tööinspektsiooni kontrollakt) — appends a new snapshot row. version is unchanged while the latest snapshot's status is 'saved' (repeat saves do not bump /V) and increments by 1 only when re-saving already-locked (confirmed) data."
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: key
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
      - field: version
        type: number
*/
-- `latest` reads form_number and current version from the most recent
-- snapshot of this act. version only increments when the snapshot being
-- re-saved is already locked (status <> 'saved') — see edit/save.yml's
-- edit_locked gate for confirmed data.
WITH latest AS (
  SELECT form_number,
         CASE WHEN status = 'saved' THEN version ELSE version + 1 END AS version
  FROM forms.labour_inspection_form
  WHERE labour_inspection_form_key = :key::BIGINT
  ORDER BY created_at DESC
  LIMIT 1
)
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
SELECT
  :key::BIGINT,
  latest.form_number,
  latest.version,
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
FROM latest
RETURNING labour_inspection_form_key AS id, form_number, version;
