/*
description: Get a single TRAM control card snapshot by snapshot ID (primary key).
namespace: control-forms
params:
  id:
    type: integer
    required: false
    description: Snapshot ID (primary key)
  form_key:
    type: integer
    required: false
    description: tram_control_card_key
returns:
- name: id
  type: string
  nullable: true
- name: formNumber
  type: string
  nullable: true
- name: version
  type: number
  nullable: true
- name: status
  type: string
  nullable: true
- name: controlYear
  type: number
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
- name: companyAddress
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
- name: drivers
  type: string
  nullable: true
- name: driverNotApplicable
  type: boolean
  nullable: true
- name: transportType
  type: string
  nullable: true
- name: transportEmptyRun
  type: boolean
  nullable: true
- name: transportNature
  type: string
  nullable: true
- name: transportNatureExempt
  type: boolean
  nullable: true
- name: transportClasses
  type: string
  nullable: true
- name: cabotageViolations
  type: string
  nullable: true
- name: resultType
  type: string
  nullable: true
- name: additionalMeasure
  type: string
  nullable: true
- name: proceedingType
  type: string
  nullable: true
- name: proceedingReferenceNumber
  type: string
  nullable: true
- name: documentChecks
  type: string
  nullable: true
- name: otherDocuments
  type: string
  nullable: true
- name: spApplicability
  type: string
  nullable: true
- name: tachographTypeCode
  type: string
  nullable: true
- name: tachographDataNotDownloaded
  type: boolean
  nullable: true
- name: checkedDaysCount
  type: string
  nullable: true
- name: workDaysCount
  type: string
  nullable: true
- name: otherActivityDaysCount
  type: string
  nullable: true
- name: violations5612006
  type: string
  nullable: true
- name: violations1652014
  type: string
  nullable: true
- name: violations200215
  type: string
  nullable: true
- name: violations5932008
  type: string
  nullable: true
- name: violations20201057
  type: string
  nullable: true
- name: erruPoints
  type: string
  nullable: true
- name: liiniNumber
  type: string
  nullable: true
- name: liiniNimetus
  type: string
  nullable: true
- name: files
  type: string
  nullable: true
- name: notes
  type: string
  nullable: true
- name: enforcementDecision
  type: string
  nullable: true
- name: proceedingClosureBasis
  type: string
  nullable: true
- name: created_by
  type: string
  nullable: true
*/
SELECT
  id,
  form_number,
  version,
  status,
  control_year,
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
  inspector_first_name,
  inspector_last_name,
  inspector_organisation_id,
  inspector_unit,
  inspector_profession,
  drivers::text AS drivers,
  driver_not_applicable,
  transport_type,
  transport_empty_run,
  transport_nature,
  transport_nature_exempt,
  transport_classes::text AS transport_classes,
  cabotage_violations::text AS cabotage_violations,
  result_type,
  additional_measure,
  proceeding_type,
  proceeding_reference_number,
  document_checks::text AS document_checks,
  other_documents::text AS other_documents,
  sp_applicability,
  tachograph_type_code,
  tachograph_data_not_downloaded,
  checked_days_count,
  work_days_count,
  other_activity_days_count,
  violations_561_2006::text AS violations_561_2006,
  violations_165_2014::text AS violations_165_2014,
  violations_2002_15::text AS violations_2002_15,
  violations_593_2008::text AS violations_593_2008,
  violations_2020_1057::text AS violations_2020_1057,
  erru_points::text AS erru_points,
  liini_number,
  liini_nimetus,
  files::text AS files,
  notes,
  enforcement_decision,
  proceeding_closure_basis,
  created_by
FROM forms.tram_control_card
WHERE id = :id::BIGINT
  AND tram_control_card_key = :form_key::BIGINT;
