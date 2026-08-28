/*
declaration:
  version: 0.1
  description: "Update TRAM control card — insert new snapshot (authority = TRAM)"
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: key
        type: string
      - field: formNumber
        type: string
      - field: status
        type: string
      - field: controlDate
        type: string
      - field: controlTime
        type: string
      - field: controlCountryCode
        type: string
      - field: county
        type: string
      - field: city
        type: string
      - field: road
        type: string
      - field: roadOther
        type: string
      - field: kilometer
        type: string
      - field: address
        type: string
      - field: road_type
        type: string
      - field: roadTaxStatus
        type: string
      - field: roadTaxNotes
        type: string
      - field: vehicleRegNr
        type: string
      - field: vehicleMake
        type: string
      - field: vehicleModel
        type: string
      - field: vehicleCountryCode
        type: string
      - field: vehicleVin
        type: string
      - field: vehicleFirstRegistration
        type: string
      - field: vehicleBodyType
        type: string
      - field: vehicleCategoryCode
        type: string
      - field: vehicleCategoryOther
        type: string
      - field: vehicleMileage
        type: string
      - field: trailers
        type: string
      - field: companyRegCode
        type: string
      - field: companyName
        type: string
      - field: companyCountryCode
        type: string
      - field: companyCounty
        type: string
      - field: companyCity
        type: string
      - field: companyAddressLine1
        type: string
      - field: companyPostalCode
        type: string
      - field: companyOwnerFirstName
        type: string
      - field: companyOwnerLastName
        type: string
      - field: companyActivityLicenceCopyNumber
        type: string
      - field: drivers
        type: string
      - field: inspectorFirstName
        type: string
      - field: inspectorLastName
        type: string
      - field: inspectorOrganisationId
        type: string
      - field: inspectorUnit
        type: string
      - field: inspectorProfession
        type: string
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
      - field: formNumber
        type: string
*/
WITH latest AS (
  SELECT form_number, template_version, control_year
  FROM forms.compound_form
  WHERE compound_form_key = :key::BIGINT
    AND authority = 'TRAM'
  ORDER BY created_at DESC
  LIMIT 1
)
INSERT INTO forms.compound_form (
  compound_form_key,
  authority,
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
  'TRAM',
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
