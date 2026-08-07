/*
declaration:
  version: 0.1
  description: "Get a single compound form snapshot by snapshot ID"
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: id
        type: string
        description: "Snapshot ID (primary key)"
      - field: form_key
        type: string
        description: "Compound form key"
  response:
    fields:
      - field: id
        type: string
      - field: form_number
        type: string
      - field: status
        type: string
      - field: control_date
        type: string
      - field: control_time
        type: string
      - field: control_country_code
        type: string
      - field: county
        type: string
      - field: city
        type: string
      - field: road
        type: string
      - field: road_other
        type: string
      - field: kilometer
        type: string
      - field: address
        type: string
      - field: road_type
        type: string
      - field: road_tax_status
        type: string
      - field: road_tax_notes
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
      - field: vehicle_category_code
        type: string
      - field: vehicle_category_other
        type: string
      - field: vehicle_mileage
        type: string
      - field: trailers
        type: string
      - field: company_reg_code
        type: string
      - field: company_name
        type: string
      - field: company_country_code
        type: string
      - field: company_county
        type: string
      - field: company_city
        type: string
      - field: company_address
        type: string
      - field: company_postal_code
        type: string
      - field: company_owner_first_name
        type: string
      - field: company_owner_last_name
        type: string
      - field: company_activity_licence_copy_number
        type: string
      - field: drivers
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
      - field: created_by
        type: string
*/
SELECT
  compound_form_key AS id,
  form_number,
  status,
  control_date,
  control_time::text AS control_time,
  control_country_code,
  county,
  city,
  road,
  road_other,
  kilometer,
  address,
  road_type,
  road_tax_status,
  road_tax_notes,
  vehicle_reg_nr,
  vehicle_make,
  vehicle_model,
  vehicle_country_code,
  vehicle_vin,
  vehicle_first_registration,
  vehicle_body_type,
  vehicle_category_code,
  vehicle_category_other,
  vehicle_mileage,
  trailers::text AS trailers,
  company_reg_code,
  company_name,
  company_country_code,
  company_county,
  company_city,
  company_address,
  company_postal_code,
  company_owner_first_name,
  company_owner_last_name,
  company_activity_licence_copy_number,
  drivers::text AS drivers,
  inspector_first_name,
  inspector_last_name,
  inspector_organisation_id,
  inspector_unit,
  inspector_profession,
  created_by
FROM forms.compound_form
WHERE id = :id::BIGINT
  AND compound_form_key = :form_key::BIGINT;
