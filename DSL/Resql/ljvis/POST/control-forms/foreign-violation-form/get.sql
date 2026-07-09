/*
declaration:
  version: 0.1
  description: "Get foreign violation form by ID"
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: id
        type: string
        description: "Foreign violation form UUID"
  response:
    fields:
      - field: id
        type: string
      - field: form_number
        type: string
      - field: reporting_country_code
        type: string
      - field: reporting_authority_name
        type: string
      - field: inspection_country_code
        type: string
      - field: inspection_date
        type: string
      - field: inspection_time
        type: string
      - field: inspection_address_line1
        type: string
      - field: inspection_address_line2
        type: string
      - field: inspection_region
        type: string
      - field: inspection_city
        type: string
      - field: company_reg_code
        type: string
      - field: company_name
        type: string
      - field: company_country_code
        type: string
      - field: company_address_line1
        type: string
      - field: company_address_line2
        type: string
      - field: company_city
        type: string
      - field: company_postal_code
        type: string
      - field: driver_first_name
        type: string
      - field: driver_last_name
        type: string
      - field: vehicle_reg_nr
        type: string
      - field: vehicle_make
        type: string
      - field: vehicle_model
        type: string
      - field: vehicle_country_code
        type: string
      - field: vehicle_vin
        type: string
      - field: vehicle_first_registration
        type: string
      - field: vehicle_body_type
        type: string
      - field: licence_copy_number
        type: string
      - field: violation_description
        type: string
      - field: minor_violations_count
        type: string
      - field: sanction_code
        type: string
      - field: sanction_notes
        type: string
      - field: recommended_measure_code
        type: string
      - field: recommended_measure_notes
        type: string
      - field: notes
        type: string
      - field: violations
        type: string
      - field: data_entry_date
        type: string
      - field: inspector_first_name
        type: string
      - field: inspector_last_name
        type: string
      - field: inspector_organisation_id
        type: string
      - field: inspector_unit
        type: string
      - field: inspector_profession
        type: string
      - field: files
        type: string
      - field: status
        type: string
      - field: created_by
        type: string
*/
SELECT
  foreign_violation_form_key AS id,
  form_number,
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
  files::text,
  status,
  created_by
FROM forms.foreign_violation_form
WHERE foreign_violation_form_key = :id;
