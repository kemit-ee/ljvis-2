/*
description: "Update labour inspection form (Tööinspektsiooni kontrollakt) — appends a new snapshot row. version is unchanged while the latest snapshot's status is 'saved' (repeat saves do not bump /V) and increments by 1 only when re-saving already-locked (confirmed) data."
namespace: control-forms
params:
  key:
    type: number
    required: false
  status:
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
  totalDriversCount:
    type: string
    required: false
  controlsMatrix:
    type: string
    required: false
  prescriptionComposed:
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
  violations:
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
