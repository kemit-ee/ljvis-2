/*
description: "Update foreign violation form"
namespace: control-forms
params:
  key:
    type: number
    required: false
  formNumber:
    type: string
    required: false
  status:
    type: string
    required: false
  reportingCountryCode:
    type: string
    required: false
  reportingAuthority:
    type: string
    required: false
  inspectionCountryCode:
    type: string
    required: false
  inspectionDate:
    type: string
    required: false
  inspectionTime:
    type: string
    required: false
  inspectionAddressLine1:
    type: string
    required: false
  inspectionAddressLine2:
    type: string
    required: false
  inspectionRegion:
    type: string
    required: false
  inspectionCity:
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
  companyAddressLine1:
    type: string
    required: false
  companyAddressLine2:
    type: string
    required: false
  companyCity:
    type: string
    required: false
  companyPostalCode:
    type: string
    required: false
  driverFirstName:
    type: string
    required: false
  driverLastName:
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
  licenceCopyNumber:
    type: string
    required: false
  violationDescription:
    type: string
    required: false
  minorViolationsCount:
    type: string
    required: false
  sanctionCode:
    type: string
    required: false
  sanctionNotes:
    type: string
    required: false
  recommendedMeasureCode:
    type: string
    required: false
  recommendedMeasureNotes:
    type: string
    required: false
  recommendedMeasureGeneralNotes:
    type: string
    required: false
  violations:
    type: string
    required: false
  dataEntryDate:
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
  - name: form_number
    type: string
    nullable: true
*/
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
VALUES (
  :key::BIGINT,
  :formNumber,
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
RETURNING foreign_violation_form_key AS id, form_number;
