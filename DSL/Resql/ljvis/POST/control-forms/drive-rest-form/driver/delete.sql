/*
description: "Delete drive rest form for driver — copy latest snapshot with status=deleted"
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
  - name: subFormNumber
    type: string
    nullable: true
*/
WITH latest AS (
  SELECT DISTINCT ON (sp_driver_form_key)
    sp_driver_form_key,
    compound_form_key,
    sub_form_number,
    template_version,
    selection_status,
    transport_type,
    transport_empty_run,
    transport_nature,
    transport_nature_exempt,
    transport_classes,
    cabotage_violations,
    result_type,
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
    mass_dimension_non_compliant,
    mass_dimension_measurements,
    atp_violation_found,
    atp_violation_description,
    erru_points,
    enforcement_decision,
    proceeding_closure_basis,
    notes
  FROM forms.sp_driver_form
  WHERE sp_driver_form_key = :id::BIGINT
  ORDER BY sp_driver_form_key, created_at DESC
)
INSERT INTO forms.sp_driver_form (
  sp_driver_form_key,
  compound_form_key,
  sub_form_number,
  template_version,
  status,
  selection_status,
  transport_type,
  transport_empty_run,
  transport_nature,
  transport_nature_exempt,
  transport_classes,
  cabotage_violations,
  result_type,
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
  mass_dimension_non_compliant,
  mass_dimension_measurements,
  atp_violation_found,
  atp_violation_description,
  erru_points,
  enforcement_decision,
  proceeding_closure_basis,
  notes,
  created_by
)
SELECT
  l.sp_driver_form_key,
  l.compound_form_key,
  l.sub_form_number,
  l.template_version,
  :status,
  l.selection_status,
  l.transport_type,
  l.transport_empty_run,
  l.transport_nature,
  l.transport_nature_exempt,
  l.transport_classes,
  l.cabotage_violations,
  l.result_type,
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
  l.mass_dimension_non_compliant,
  l.mass_dimension_measurements,
  l.atp_violation_found,
  l.atp_violation_description,
  l.erru_points,
  l.enforcement_decision,
  l.proceeding_closure_basis,
  l.notes,
  :created_by
FROM latest l
RETURNING sp_driver_form_key AS id, sub_form_number;
