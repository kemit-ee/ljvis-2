/*
description: "Get a single labour inspection form snapshot by snapshot ID"
namespace: control-forms
params:
  id:
    type: string
    required: false
    description: "Snapshot ID (primary key)"
  form_key:
    type: string
    required: false
    description: "Labour inspection form key"
returns:
  - name: id
    type: string
    nullable: true
  - name: form_number
    type: string
    nullable: true
  - name: version
    type: number
    nullable: true
  - name: status
    type: string
    nullable: true
  - name: inspector_name
    type: string
    nullable: true
  - name: inspection_date
    type: string
    nullable: true
  - name: external_inspection_id
    type: string
    nullable: true
  - name: inspection_type
    type: string
    nullable: true
  - name: company_name
    type: string
    nullable: true
  - name: company_reg_code
    type: string
    nullable: true
  - name: vehicle_count
    type: string
    nullable: true
  - name: total_drivers_count
    type: string
    nullable: true
  - name: controls_matrix
    type: string
    nullable: true
  - name: prescription_composed
    type: string
    nullable: true
  - name: punished_person_id_code
    type: string
    nullable: true
  - name: punished_person_first_name
    type: string
    nullable: true
  - name: punished_person_last_name
    type: string
    nullable: true
  - name: proceeding_reference_number
    type: string
    nullable: true
  - name: enforcement_decision
    type: string
    nullable: true
  - name: proceeding_closure_basis
    type: string
    nullable: true
  - name: violations
    type: string
    nullable: true
  - name: created_by
    type: string
    nullable: true
*/
SELECT
  id,
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
WHERE id = :id::BIGINT
  AND labour_inspection_form_key = :form_key::BIGINT;
