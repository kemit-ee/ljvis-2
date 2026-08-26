/*
description: "Get compound form by ID"
namespace: control-forms
params:
  id:
    type: number
    required: false
    description: "Compound form key"
returns:
  - name: id
    type: string
    nullable: true
  - name: formNumber
    type: string
    nullable: true
  - name: status
    type: string
    nullable: true
  - name: controlDate
    type: string
    nullable: true
  - name: controlTime
    type: string
    nullable: true
  - name: controlCountryCode
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
  - name: roadOther
    type: string
    nullable: true
  - name: kilometer
    type: string
    nullable: true
  - name: address
    type: string
    nullable: true
  - name: roadType
    type: string
    nullable: true
  - name: roadTaxStatus
    type: string
    nullable: true
  - name: roadTaxNotes
    type: string
    nullable: true
  - name: vehicleRegNr
    type: string
    nullable: true
  - name: vehicleMake
    type: string
    nullable: true
  - name: vehicleModel
    type: string
    nullable: true
  - name: vehicleCountryCode
    type: string
    nullable: true
  - name: vehicleVin
    type: string
    nullable: true
  - name: vehicleFirstRegistration
    type: string
    nullable: true
  - name: vehicleBodyType
    type: string
    nullable: true
  - name: vehicleCategoryCode
    type: string
    nullable: true
  - name: vehicleCategoryOther
    type: string
    nullable: true
  - name: vehicleMileage
    type: string
    nullable: true
  - name: trailers
    type: string
    nullable: true
  - name: companyRegCode
    type: string
    nullable: true
  - name: companyName
    type: string
    nullable: true
  - name: companyCountryCode
    type: string
    nullable: true
  - name: companyCounty
    type: string
    nullable: true
  - name: companyCity
    type: string
    nullable: true
  - name: companyAddressLine1
    type: string
    nullable: true
  - name: companyPostalCode
    type: string
    nullable: true
  - name: companyOwnerFirstName
    type: string
    nullable: true
  - name: companyOwnerLastName
    type: string
    nullable: true
  - name: companyActivityLicenceCopyNumber
    type: string
    nullable: true
  - name: drivers
    type: string
    nullable: true
  - name: inspectorFirstName
    type: string
    nullable: true
  - name: inspectorLastName
    type: string
    nullable: true
  - name: inspectorOrganisationId
    type: string
    nullable: true
  - name: inspectorUnit
    type: string
    nullable: true
  - name: inspectorProfession
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
  control_time::TEXT AS control_time,
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
WHERE compound_form_key = :id::BIGINT
ORDER BY created_at DESC
LIMIT 1;
