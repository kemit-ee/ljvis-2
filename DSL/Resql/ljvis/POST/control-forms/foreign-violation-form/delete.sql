/*
description: "Delete foreign violation form — copy latest snapshot with status=deleted"
namespace: control-forms
params:
  id:
    type: number
    required: false
  status:
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
*/
WITH latest AS (
  SELECT DISTINCT ON (foreign_violation_form_key)
    foreign_violation_form_key,
    form_number,
    template_version,
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
    violations,
    data_entry_date,
    inspector_first_name,
    inspector_last_name,
    inspector_organisation_id,
    inspector_unit,
    inspector_profession
  FROM forms.foreign_violation_form
  WHERE foreign_violation_form_key = :id::BIGINT
  ORDER BY foreign_violation_form_key, created_at DESC
)
INSERT INTO forms.foreign_violation_form (
  foreign_violation_form_key,
  form_number,
  template_version,
  status,
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
  violations,
  data_entry_date,
  inspector_first_name,
  inspector_last_name,
  inspector_organisation_id,
  inspector_unit,
  inspector_profession,
  created_by
)
SELECT
  l.foreign_violation_form_key,
  l.form_number,
  l.template_version,
  :status,
  l.reporting_country_code,
  l.reporting_authority_name,
  l.inspection_country_code,
  l.inspection_date,
  l.inspection_time,
  l.inspection_address_line1,
  l.inspection_address_line2,
  l.inspection_region,
  l.inspection_city,
  l.company_reg_code,
  l.company_name,
  l.company_country_code,
  l.company_address_line1,
  l.company_address_line2,
  l.company_city,
  l.company_postal_code,
  l.driver_first_name,
  l.driver_last_name,
  l.vehicle_reg_nr,
  l.vehicle_make,
  l.vehicle_model,
  l.vehicle_country_code,
  l.vehicle_vin,
  l.vehicle_first_registration,
  l.vehicle_body_type,
  l.licence_copy_number,
  l.violation_description,
  l.minor_violations_count,
  l.sanction_code,
  l.sanction_notes,
  l.recommended_measure_code,
  l.recommended_measure_notes,
  l.notes,
  l.violations,
  l.data_entry_date,
  l.inspector_first_name,
  l.inspector_last_name,
  l.inspector_organisation_id,
  l.inspector_unit,
  l.inspector_profession,
  :created_by
FROM latest l
RETURNING foreign_violation_form_key AS id, form_number;
