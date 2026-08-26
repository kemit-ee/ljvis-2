/*
description: "Update compound form — insert new snapshot with updated data"
namespace: control-forms
params:
  key:
    type: string
    required: false
  formNumber:
    type: string
    required: false
  status:
    type: string
    required: false
  controlDate:
    type: string
    required: false
  controlTime:
    type: string
    required: false
  controlCountryCode:
    type: string
    required: false
  county:
    type: string
    required: false
  city:
    type: string
    required: false
  road:
    type: string
    required: false
  roadOther:
    type: string
    required: false
  kilometer:
    type: string
    required: false
  address:
    type: string
    required: false
  road_type:
    type: string
    required: false
  roadTaxStatus:
    type: string
    required: false
  roadTaxNotes:
    type: string
    required: false
  vehicleRegNr:
    type: string
    required: false
  vehicleMake:
    type: string
    required: false
  vehicleModel:
    type: string
    required: false
  vehicleCountryCode:
    type: string
    required: false
  vehicleVin:
    type: string
    required: false
  vehicleFirstRegistration:
    type: string
    required: false
  vehicleBodyType:
    type: string
    required: false
  vehicleCategoryCode:
    type: string
    required: false
  vehicleCategoryOther:
    type: string
    required: false
  vehicleMileage:
    type: string
    required: false
  trailers:
    type: string
    required: false
  companyRegCode:
    type: string
    required: false
  companyName:
    type: string
    required: false
  companyCountryCode:
    type: string
    required: false
  companyCounty:
    type: string
    required: false
  companyCity:
    type: string
    required: false
  companyAddressLine1:
    type: string
    required: false
  companyPostalCode:
    type: string
    required: false
  companyOwnerFirstName:
    type: string
    required: false
  companyOwnerLastName:
    type: string
    required: false
  companyActivityLicenceCopyNumber:
    type: string
    required: false
  drivers:
    type: string
    required: false
  inspectorFirstName:
    type: string
    required: false
  inspectorLastName:
    type: string
    required: false
  inspectorOrganisationId:
    type: string
    required: false
  inspectorUnit:
    type: string
    required: false
  inspectorProfession:
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
  SELECT form_number, template_version, control_year
  FROM forms.compound_form
  WHERE compound_form_key = :key::BIGINT
  ORDER BY created_at DESC
  LIMIT 1
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
  :key::BIGINT,
  :formNumber,
  l.control_year,
  l.template_version,
  :status,
  :controlDate::DATE,
  :controlTime::TIME,
  :controlCountryCode,
  :county,
  NULLIF(:city, ''),
  NULLIF(:road, ''),
  NULLIF(:roadOther, ''),
  NULLIF(:kilometer, '')::INTEGER,
  NULLIF(:address, ''),
  NULLIF(:road_type, ''),
  NULLIF(:roadTaxStatus, ''),
  NULLIF(:roadTaxNotes, ''),
  :inspectorFirstName,
  :inspectorLastName,
  :inspectorOrganisationId,
  :inspectorUnit,
  :inspectorProfession,
  :vehicleRegNr,
  NULLIF(:vehicleMake, ''),
  NULLIF(:vehicleModel, ''),
  :vehicleCountryCode,
  NULLIF(:vehicleVin, ''),
  NULLIF(:vehicleFirstRegistration, '')::DATE,
  NULLIF(:vehicleBodyType, ''),
  :vehicleCategoryCode,
  NULLIF(:vehicleCategoryOther, ''),
  NULLIF(:vehicleMileage, '')::INTEGER,
  COALESCE(NULLIF(:trailers, '')::jsonb, '[]'::jsonb),
  :companyRegCode,
  :companyName,
  :companyCountryCode,
  NULLIF(:companyCounty, ''),
  NULLIF(:companyCity, ''),
  NULLIF(:companyAddressLine1, ''),
  NULLIF(:companyPostalCode, ''),
  NULLIF(:companyOwnerFirstName, ''),
  NULLIF(:companyOwnerLastName, ''),
  NULLIF(:companyActivityLicenceCopyNumber, ''),
  COALESCE(NULLIF(:drivers, '')::jsonb, '[]'::jsonb),
  :created_by
FROM latest l
RETURNING compound_form_key AS id, form_number AS "formNumber";
