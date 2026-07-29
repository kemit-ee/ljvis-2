/*
declaration:
  version: 0.1
  description: "Delete labour inspection form — copy latest snapshot with status=deleted"
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: id
        type: string
      - field: status
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
WITH latest AS (
  SELECT DISTINCT ON (labour_inspection_form_key)
    labour_inspection_form_key,
    form_number,
    inspector_name,
    inspection_date,
    external_inspection_id,
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
    enforcement_decision,
    proceeding_closure_basis,
    violations
  FROM forms.labour_inspection_form
  WHERE labour_inspection_form_key = :id::BIGINT
  ORDER BY labour_inspection_form_key, created_at DESC
)
INSERT INTO forms.labour_inspection_form (
  labour_inspection_form_key,
  form_number,
  status,
  inspector_name,
  inspection_date,
  external_inspection_id,
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
  enforcement_decision,
  proceeding_closure_basis,
  violations,
  created_by
)
SELECT
  l.labour_inspection_form_key,
  l.form_number,
  :status,
  l.inspector_name,
  l.inspection_date,
  l.external_inspection_id,
  l.inspection_type,
  l.company_name,
  l.company_reg_code,
  l.vehicle_count,
  l.total_drivers_count,
  l.controls_matrix,
  l.prescription_composed,
  l.punished_person_id_code,
  l.punished_person_first_name,
  l.punished_person_last_name,
  l.proceeding_reference_number,
  l.enforcement_decision,
  l.proceeding_closure_basis,
  l.violations,
  :created_by
FROM latest l
RETURNING labour_inspection_form_key AS id, form_number;
