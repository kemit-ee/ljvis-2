/*
declaration:
  version: 0.1
  description: "Get labour inspection form by ID (latest snapshot)"
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: id
        type: string
        description: "Labour inspection form ID"
  response:
    fields:
      - field: id
        type: string
      - field: form_number
        type: string
      - field: version
        type: number
      - field: status
        type: string
      - field: inspector_name
        type: string
      - field: inspection_date
        type: string
      - field: external_inspection_id
        type: string
      - field: inspection_type
        type: string
      - field: company_name
        type: string
      - field: company_reg_code
        type: string
      - field: vehicle_count
        type: string
      - field: total_drivers_count
        type: string
      - field: controls_matrix
        type: string
      - field: prescription_composed
        type: string
      - field: punished_person_id_code
        type: string
      - field: punished_person_first_name
        type: string
      - field: punished_person_last_name
        type: string
      - field: proceeding_reference_number
        type: string
      - field: enforcement_decision
        type: string
      - field: proceeding_closure_basis
        type: string
      - field: violations
        type: string
      - field: created_by
        type: string
*/
SELECT
  labour_inspection_form_key AS id,
  form_number,
  version,
  status,
  inspector_name,
  inspection_date,
  external_inspection_id,
  inspection_type,
  company_name,
  company_reg_code,
  vehicle_count,
  total_drivers_count,
  controls_matrix::text,
  prescription_composed,
  punished_person_id_code,
  punished_person_first_name,
  punished_person_last_name,
  proceeding_reference_number,
  enforcement_decision,
  proceeding_closure_basis,
  violations::text,
  created_by
FROM forms.labour_inspection_form
WHERE labour_inspection_form_key = :id::BIGINT
ORDER BY created_at DESC
LIMIT 1;
