/*
description: Soft-delete a TRAM control card — copies the latest snapshot forward with status='deleted'
  (same version). INSERT-only tombstone; rows stay for audit and are hidden from search/view.
namespace: control-forms
params:
  id:
    type: integer
    required: false
    description: tram_control_card_key
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
- name: version
  type: number
  nullable: true
*/
WITH latest AS (
  SELECT DISTINCT ON (tram_control_card_key) *
  FROM forms.tram_control_card
  WHERE tram_control_card_key = :id::BIGINT
  ORDER BY tram_control_card_key, created_at DESC
)
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
  enforcement_decision,
  proceeding_closure_basis,
  created_by
)
SELECT
  l.tram_control_card_key,
  l.form_number,
  l.control_year,
  l.version,
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
  l.inspector_first_name,
  l.inspector_last_name,
  l.inspector_organisation_id,
  l.inspector_unit,
  l.inspector_profession,
  l.drivers,
  l.driver_not_applicable,
  l.transport_type,
  l.transport_empty_run,
  l.transport_nature,
  l.transport_nature_exempt,
  l.transport_classes,
  l.cabotage_violations,
  l.result_type,
  l.additional_measure,
  l.proceeding_type,
  l.proceeding_reference_number,
  l.document_checks,
  l.other_documents,
  l.sp_applicability,
  l.tachograph_type_code,
  l.tachograph_data_not_downloaded,
  l.checked_days_count,
  l.work_days_count,
  l.other_activity_days_count,
  l.violations_561_2006,
  l.violations_165_2014,
  l.violations_2002_15,
  l.violations_593_2008,
  l.violations_2020_1057,
  l.erru_points,
  l.liini_number,
  l.liini_nimetus,
  l.files,
  l.notes,
  l.enforcement_decision,
  l.proceeding_closure_basis,
  :created_by
FROM latest l
RETURNING tram_control_card_key AS id, form_number, version;
