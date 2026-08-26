/*
description: "Delete compound form — copy latest snapshot with status=deleted"
namespace: control-forms
params:
  id:
    type: string
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
  - name: formNumber
    type: string
    nullable: true
*/
WITH latest AS (
  SELECT DISTINCT ON (compound_form_key)
    compound_form_key,
    form_number,
    control_year,
    template_version,
    control_date,
    control_time,
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
    inspector_first_name,
    inspector_last_name,
    inspector_organisation_id,
    inspector_unit,
    inspector_profession,
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
    trailers,
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
    drivers
  FROM forms.compound_form
  WHERE compound_form_key = :id::BIGINT
  ORDER BY compound_form_key, created_at DESC
)
INSERT INTO forms.compound_form (
  compound_form_key,
  form_number,
  control_year,
  template_version,
  status,
  control_date,
  control_time,
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
  inspector_first_name,
  inspector_last_name,
  inspector_organisation_id,
  inspector_unit,
  inspector_profession,
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
  trailers,
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
  drivers,
  created_by
)
SELECT
  l.compound_form_key,
  l.form_number,
  l.control_year,
  l.template_version,
  :status,
  l.control_date,
  l.control_time,
  l.control_country_code,
  l.county,
  l.city,
  l.road,
  l.road_other,
  l.kilometer,
  l.address,
  l.road_type,
  l.road_tax_status,
  l.road_tax_notes,
  l.inspector_first_name,
  l.inspector_last_name,
  l.inspector_organisation_id,
  l.inspector_unit,
  l.inspector_profession,
  l.vehicle_reg_nr,
  l.vehicle_make,
  l.vehicle_model,
  l.vehicle_country_code,
  l.vehicle_vin,
  l.vehicle_first_registration,
  l.vehicle_body_type,
  l.vehicle_category_code,
  l.vehicle_category_other,
  l.vehicle_mileage,
  l.trailers,
  l.company_reg_code,
  l.company_name,
  l.company_country_code,
  l.company_county,
  l.company_city,
  l.company_address,
  l.company_postal_code,
  l.company_owner_first_name,
  l.company_owner_last_name,
  l.company_activity_licence_copy_number,
  l.drivers,
  :created_by
FROM latest l
RETURNING compound_form_key AS id, form_number AS "formNumber";
