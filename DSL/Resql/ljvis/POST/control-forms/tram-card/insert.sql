/*
description: Insert a TRAM control card (Transpordiameti kontrollkaart) — first save. INSERT-only snapshot.
namespace: control-forms
params:
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
  roadType:
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
  companyAddress:
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
  drivers:
    type: string
    required: false
  driverNotApplicable:
    type: string
    required: false
  transportType:
    type: string
    required: false
  transportEmptyRun:
    type: string
    required: false
  transportNature:
    type: string
    required: false
  transportNatureExempt:
    type: string
    required: false
  transportClasses:
    type: string
    required: false
  cabotageViolations:
    type: string
    required: false
  resultType:
    type: string
    required: false
  additionalMeasure:
    type: string
    required: false
  proceedingType:
    type: string
    required: false
  proceedingReferenceNumber:
    type: string
    required: false
  documentChecks:
    type: string
    required: false
  otherDocuments:
    type: string
    required: false
  spApplicability:
    type: string
    required: false
  tachographTypeCode:
    type: string
    required: false
  tachographDataNotDownloaded:
    type: string
    required: false
  checkedDaysCount:
    type: string
    required: false
  workDaysCount:
    type: string
    required: false
  otherActivityDaysCount:
    type: string
    required: false
  violations5612006:
    type: string
    required: false
  violations1652014:
    type: string
    required: false
  violations200215:
    type: string
    required: false
  violations5932008:
    type: string
    required: false
  violations20201057:
    type: string
    required: false
  erruPoints:
    type: string
    required: false
  liiniNumber:
    type: string
    required: false
  liiniNimetus:
    type: string
    required: false
  files:
    type: string
    required: false
  notes:
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
- name: version
  type: number
  nullable: true
*/
WITH ins AS (
  INSERT INTO forms.tram_control_card (
    tram_control_card_key,
    form_number,
    control_year,
    version,
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
    inspector_first_name,
    inspector_last_name,
    inspector_organisation_id,
    inspector_unit,
    inspector_profession,
    drivers,
    driver_not_applicable,
    transport_type,
    transport_empty_run,
    transport_nature,
    transport_nature_exempt,
    transport_classes,
    cabotage_violations,
    result_type,
    additional_measure,
    proceeding_type,
    proceeding_reference_number,
    document_checks,
    other_documents,
    sp_applicability,
    tachograph_type_code,
    tachograph_data_not_downloaded,
    checked_days_count,
    work_days_count,
    other_activity_days_count,
    violations_561_2006,
    violations_165_2014,
    violations_2002_15,
    violations_593_2008,
    violations_2020_1057,
    erru_points,
    liini_number,
    liini_nimetus,
    files,
    notes,
    created_by
  )
  VALUES (
    nextval('forms.seq_tram_control_card_key'),
    'tram-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(nextval('forms.seq_tram_control_card_number')::text, 5, '0'),
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    1,
    :status,
    :controlDate::DATE,
    NULLIF(:controlTime, '')::TIME,
    NULLIF(:controlCountryCode, ''),
    NULLIF(:county, ''),
    NULLIF(:city, ''),
    NULLIF(:road, ''),
    NULLIF(:roadOther, ''),
    NULLIF(:kilometer, '')::INTEGER,
    NULLIF(:address, ''),
    NULLIF(:roadType, ''),
    NULLIF(:roadTaxStatus, ''),
    NULLIF(:roadTaxNotes, ''),
    NULLIF(:vehicleRegNr, ''),
    NULLIF(:vehicleMake, ''),
    NULLIF(:vehicleModel, ''),
    NULLIF(:vehicleCountryCode, ''),
    NULLIF(:vehicleVin, ''),
    NULLIF(:vehicleFirstRegistration, '')::DATE,
    NULLIF(:vehicleBodyType, ''),
    NULLIF(:vehicleCategoryCode, ''),
    NULLIF(:vehicleCategoryOther, ''),
    NULLIF(:vehicleMileage, '')::INTEGER,
    COALESCE(NULLIF(:trailers, '')::jsonb, '[]'::jsonb),
    NULLIF(:companyRegCode, ''),
    NULLIF(:companyName, ''),
    NULLIF(:companyCountryCode, ''),
    NULLIF(:companyCounty, ''),
    NULLIF(:companyCity, ''),
    NULLIF(:companyAddress, ''),
    NULLIF(:companyPostalCode, ''),
    NULLIF(:companyOwnerFirstName, ''),
    NULLIF(:companyOwnerLastName, ''),
    NULLIF(:companyActivityLicenceCopyNumber, ''),
    NULLIF(:inspectorFirstName, ''),
    NULLIF(:inspectorLastName, ''),
    NULLIF(:inspectorOrganisationId, ''),
    NULLIF(:inspectorUnit, ''),
    NULLIF(:inspectorProfession, ''),
    COALESCE(NULLIF(:drivers, '')::jsonb, '[]'::jsonb),
    COALESCE(NULLIF(:driverNotApplicable, '') IN ('true', '1', 'yes'), FALSE),
    NULLIF(:transportType, ''),
    COALESCE(NULLIF(:transportEmptyRun, '') IN ('true', '1', 'yes'), FALSE),
    NULLIF(:transportNature, ''),
    CASE WHEN NULLIF(:transportNatureExempt, '') IS NULL THEN NULL ELSE :transportNatureExempt IN ('true', '1', 'yes') END,
    COALESCE(NULLIF(:transportClasses, '')::jsonb, '[]'::jsonb),
    COALESCE(NULLIF(:cabotageViolations, '')::jsonb, '[]'::jsonb),
    COALESCE(NULLIF(:resultType, ''), 'ok'),
    NULLIF(:additionalMeasure, ''),
    COALESCE(NULLIF(:proceedingType, ''), 'none'),
    NULLIF(:proceedingReferenceNumber, ''),
    COALESCE(NULLIF(:documentChecks, '')::jsonb, '[]'::jsonb),
    COALESCE(NULLIF(:otherDocuments, '')::jsonb, '[]'::jsonb),
    COALESCE(NULLIF(:spApplicability, ''), 'not_checked'),
    NULLIF(:tachographTypeCode, ''),
    COALESCE(NULLIF(:tachographDataNotDownloaded, '') IN ('true', '1', 'yes'), FALSE),
    NULLIF(:checkedDaysCount, '')::INTEGER,
    NULLIF(:workDaysCount, '')::INTEGER,
    NULLIF(:otherActivityDaysCount, '')::INTEGER,
    COALESCE(NULLIF(:violations5612006, '')::jsonb, '[]'::jsonb),
    COALESCE(NULLIF(:violations1652014, '')::jsonb, '[]'::jsonb),
    COALESCE(NULLIF(:violations200215, '')::jsonb, '[]'::jsonb),
    COALESCE(NULLIF(:violations5932008, '')::jsonb, '[]'::jsonb),
    COALESCE(NULLIF(:violations20201057, '')::jsonb, '[]'::jsonb),
    COALESCE(NULLIF(:erruPoints, '')::jsonb, '[]'::jsonb),
    NULLIF(:liiniNumber, ''),
    NULLIF(:liiniNimetus, ''),
    COALESCE(NULLIF(:files, '')::jsonb, '[]'::jsonb),
    NULLIF(:notes, ''),
    :created_by
  )
  RETURNING tram_control_card_key, form_number, version
)
SELECT tram_control_card_key AS id, form_number, version FROM ins;
