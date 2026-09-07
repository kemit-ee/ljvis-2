/*
description: Get foreign violation form by ID
namespace: control-forms
params:
  id:
    type: integer
    required: false
    description: Foreign violation form ID
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
- name: reporting_country_code
  type: string
  nullable: true
- name: reporting_authority_name
  type: string
  nullable: true
- name: inspection_country_code
  type: string
  nullable: true
- name: inspection_date
  type: string
  nullable: true
- name: inspection_time
  type: string
  nullable: true
- name: inspection_address_line1
  type: string
  nullable: true
- name: inspection_address_line2
  type: string
  nullable: true
- name: inspection_region
  type: string
  nullable: true
- name: inspection_city
  type: string
  nullable: true
- name: company_reg_code
  type: string
  nullable: true
- name: company_name
  type: string
  nullable: true
- name: company_country_code
  type: string
  nullable: true
- name: company_address_line1
  type: string
  nullable: true
- name: company_address_line2
  type: string
  nullable: true
- name: company_city
  type: string
  nullable: true
- name: company_postal_code
  type: string
  nullable: true
- name: driver_first_name
  type: string
  nullable: true
- name: driver_last_name
  type: string
  nullable: true
- name: vehicle_reg_nr
  type: string
  nullable: true
- name: vehicle_make
  type: string
  nullable: true
- name: vehicle_model
  type: string
  nullable: true
- name: vehicle_country_code
  type: string
  nullable: true
- name: vehicle_vin
  type: string
  nullable: true
- name: vehicle_first_registration
  type: string
  nullable: true
- name: vehicle_body_type
  type: string
  nullable: true
- name: licence_copy_number
  type: string
  nullable: true
- name: violation_description
  type: string
  nullable: true
- name: minor_violations_count
  type: string
  nullable: true
- name: sanction_code
  type: string
  nullable: true
- name: sanction_notes
  type: string
  nullable: true
- name: recommended_measure_code
  type: string
  nullable: true
- name: recommended_measure_notes
  type: string
  nullable: true
- name: notes
  type: string
  nullable: true
- name: violations
  type: string
  nullable: true
- name: data_entry_date
  type: string
  nullable: true
- name: inspector_first_name
  type: string
  nullable: true
- name: inspector_last_name
  type: string
  nullable: true
- name: inspector_organisation_id
  type: string
  nullable: true
- name: inspector_unit
  type: string
  nullable: true
- name: inspector_profession
  type: string
  nullable: true
- name: additional_sanction_codes
  type: string
  nullable: true
- name: klim_clarification_date
  type: string
  nullable: true
- name: carrier_explanation_date
  type: string
  nullable: true
- name: penalty_valid_until
  type: string
  nullable: true
- name: penalty_expired_or_processed
  type: string
  nullable: true
- name: akvk_next_meeting_date
  type: string
  nullable: true
- name: commission_last_decision_date
  type: string
  nullable: true
- name: admin_procedure_decision
  type: string
  nullable: true
- name: foreign_authority_proposal
  type: string
  nullable: true
- name: notify_carrier
  type: string
  nullable: true
- name: erru_ncr_message_key
  type: number
  nullable: true
- name: status
  type: string
  nullable: true
- name: created_by
  type: string
  nullable: true
*/
SELECT
  foreign_violation_form_key AS id,
  form_number,
  version,
  reporting_country_code,
  reporting_authority_name,
  inspection_country_code,
  inspection_date,
  inspection_time,
  inspection_address_line1,
  inspection_address_line2,
  inspection_region,
  inspection_city,
  company_reg_code,
  company_name,
  company_country_code,
  company_address_line1,
  company_address_line2,
  company_city,
  company_postal_code,
  driver_first_name,
  driver_last_name,
  vehicle_reg_nr,
  vehicle_make,
  vehicle_model,
  vehicle_country_code,
  vehicle_vin,
  vehicle_first_registration,
  vehicle_body_type,
  licence_copy_number,
  violation_description,
  minor_violations_count,
  sanction_code,
  sanction_notes,
  recommended_measure_code,
  recommended_measure_notes,
  notes,
  violations::text,
  data_entry_date,
  inspector_first_name,
  inspector_last_name,
  inspector_organisation_id,
  inspector_unit,
  inspector_profession,
  additional_sanction_codes::text,
  klim_clarification_date,
  carrier_explanation_date,
  penalty_valid_until,
  penalty_expired_or_processed,
  akvk_next_meeting_date,
  commission_last_decision_date,
  admin_procedure_decision,
  foreign_authority_proposal,
  notify_carrier,
  erru_ncr_message_key,
  status,
  created_by
FROM forms.foreign_violation_form
WHERE foreign_violation_form_key = :id::BIGINT
ORDER BY created_at DESC
LIMIT 1;
