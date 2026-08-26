/*
description: "Get a single compound form snapshot by snapshot ID"
namespace: control-forms
params:
  id:
    type: number
    required: false
    description: "Snapshot ID (primary key)"
  form_key:
    type: number
    required: false
    description: "Compound form key"
returns:
  - name: id
    type: string
    nullable: true
  - name: form_number
    type: string
    nullable: true
  - name: status
    type: string
    nullable: true
  - name: control_date
    type: string
    nullable: true
  - name: control_time
    type: string
    nullable: true
  - name: control_country_code
    type: string
    nullable: true
  - name: county
    type: string
    nullable: true
  - name: city
    type: string
    nullable: true
  - name: road
    type: string
    nullable: true
  - name: road_other
    type: string
    nullable: true
  - name: kilometer
    type: string
    nullable: true
  - name: address
    type: string
    nullable: true
  - name: road_type
    type: string
    nullable: true
  - name: road_tax_status
    type: string
    nullable: true
  - name: road_tax_notes
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
  - name: vehicle_category_code
    type: string
    nullable: true
  - name: vehicle_category_other
    type: string
    nullable: true
  - name: vehicle_mileage
    type: string
    nullable: true
  - name: trailers
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
  - name: company_county
    type: string
    nullable: true
  - name: company_city
    type: string
    nullable: true
  - name: company_address
    type: string
    nullable: true
  - name: company_postal_code
    type: string
    nullable: true
  - name: company_owner_first_name
    type: string
    nullable: true
  - name: company_owner_last_name
    type: string
    nullable: true
  - name: company_activity_licence_copy_number
    type: string
    nullable: true
  - name: drivers
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
  - name: created_by
    type: string
    nullable: true
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
