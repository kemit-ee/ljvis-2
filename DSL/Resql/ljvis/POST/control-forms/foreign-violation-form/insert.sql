/*
declaration:
  version: 0.1
  description: "Insert foreign violation form"
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: status
        type: string
      - field: reportingCountryCode
        type: string
      - field: reportingAuthority
        type: string
      - field: inspectionCountryCode
        type: string
      - field: inspectionDate
        type: string
      - field: inspectionTime
        type: string
      - field: inspectionAddressLine1
        type: string
      - field: inspectionAddressLine2
        type: string
      - field: inspectionRegion
        type: string
      - field: inspectionCity
        type: string
      - field: companyRegCode
        type: string
      - field: companyName
        type: string
      - field: companyCountryCode
        type: string
      - field: companyAddressLine1
        type: string
      - field: companyAddressLine2
        type: string
      - field: companyCity
        type: string
      - field: companyPostalCode
        type: string
      - field: driverFirstName
        type: string
      - field: driverLastName
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
      - field: licenceCopyNumber
        type: string
      - field: violationDescription
        type: string
      - field: minorViolationsCount
        type: string
      - field: sanctionCode
        type: string
      - field: sanctionNotes
        type: string
      - field: recommendedMeasureCode
        type: string
      - field: recommendedMeasureNotes
        type: string
      - field: recommendedMeasureGeneralNotes
        type: string
      - field: violations
        type: string
      - field: dataEntryDate
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
      - field: form_number
        type: string
      - field: version
        type: number
*/
INSERT INTO forms.foreign_violation_form (
  foreign_violation_form_key,
  form_number,
  version,
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
VALUES (
  nextval('forms.seq_foreign_violation_form_key'),
  'vr-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(currval('forms.seq_foreign_violation_form_key')::text, 5, '0'),
  1,
  1,
  :status,
  :reportingCountryCode,
  :reportingAuthority,
  NULLIF(:inspectionCountryCode, ''),
  :inspectionDate::DATE,
  NULLIF(:inspectionTime, '')::TIME,
  NULLIF(:inspectionAddressLine1, ''),
  NULLIF(:inspectionAddressLine2, ''),
  NULLIF(:inspectionRegion, ''),
  NULLIF(:inspectionCity, ''),
  NULLIF(:companyRegCode, ''),
  NULLIF(:companyName, ''),
  NULLIF(:companyCountryCode, ''),
  NULLIF(:companyAddressLine1, ''),
  NULLIF(:companyAddressLine2, ''),
  NULLIF(:companyCity, ''),
  NULLIF(:companyPostalCode, ''),
  NULLIF(:driverFirstName, ''),
  NULLIF(:driverLastName, ''),
  NULLIF(:vehicleRegNr, ''),
  NULLIF(:vehicleMake, ''),
  NULLIF(:vehicleModel, ''),
  NULLIF(:vehicleCountryCode, ''),
  NULLIF(:vehicleVin, ''),
  NULLIF(:vehicleFirstRegistration, '')::DATE,
  NULLIF(:vehicleBodyType, ''),
  NULLIF(:licenceCopyNumber, ''),
  NULLIF(:violationDescription, ''),
  NULLIF(:minorViolationsCount, '')::INTEGER,
  :sanctionCode,
  NULLIF(:sanctionNotes, ''),
  :recommendedMeasureCode,
  NULLIF(:recommendedMeasureNotes, ''),
  NULLIF(:recommendedMeasureGeneralNotes, ''),
  :violations::json,
  :dataEntryDate::DATE,
  :inspectorFirstName,
  :inspectorLastName,
  :inspectorOrganisationId,
  :inspectorUnit,
  :inspectorProfession,
  :created_by
)
RETURNING foreign_violation_form_key AS id, form_number, version;
