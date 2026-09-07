/*
description: Check if a foreign violation form already exists for the same company+vehicle+inspection date combination
namespace: control-forms
params:
  companyRegCode:
    type: string
    required: false
  vehicleRegNr:
    type: string
    required: false
  inspectionDate:
    type: string
    required: false
  excludeId:
    type: string
    required: false
returns:
- name: id
  type: number
  nullable: true
- name: form_number
  type: string
  nullable: true
- name: status
  type: string
  nullable: true
*/
SELECT DISTINCT ON (foreign_violation_form_key)
  foreign_violation_form_key AS id,
  form_number,
  status
FROM forms.foreign_violation_form
WHERE status NOT IN ('deleted')
  AND (
    NULLIF(:companyRegCode, '') IS NOT NULL
    AND company_reg_code = :companyRegCode
    AND vehicle_reg_nr    = NULLIF(:vehicleRegNr, '')
    AND inspection_date   = NULLIF(:inspectionDate, '')::DATE
  )
  AND (NULLIF(:excludeId, '') IS NULL OR foreign_violation_form_key <> :excludeId::BIGINT)
ORDER BY foreign_violation_form_key DESC, created_at DESC
LIMIT 1;
