/*
description: Delete trailer technical-check sub-form - copy latest snapshot with status=deleted
namespace: control-forms
params:
  id:
    type: integer
    required: false
  status:
    type: string
    required: false
  created_by:
    type: string
    required: false
returns:
- name: compound_form_key
  type: number
  nullable: true
- name: id
  type: number
  nullable: true
- name: subFormNumber
  type: string
  nullable: true
*/
WITH latest AS (
  SELECT DISTINCT ON (trailer_technical_form_key)
    trailer_technical_form_key,
    compound_form_key,
    sub_form_number,
    version,
    revision,
    parts_summary,
    parts_defects,
    result_type,
    result_transport_interruption,
    era_yv_mnt_regnr,
    era_yv_mnt_vintin,
    era_yv_mnt_axles,
    era_yv_mnt_places,
    era_yv_mnt_rebuilt,
    proceeding_type,
    proceeding_reference_number,
    violations,
    notes,
    extraordinary_inspection_date,
    enforcement_decision,
    proceeding_closure_basis,
    klim_clarification_date,
    carrier_explanation_date,
    penalty_valid_until,
    penalty_expired_or_processed,
    akvk_next_meeting_date,
    commission_last_decision_date,
    admin_procedure_decision
  FROM forms.trailer_technical_form
  WHERE trailer_technical_form_key = :id::BIGINT
  ORDER BY trailer_technical_form_key, created_at DESC
)
INSERT INTO forms.trailer_technical_form (
  trailer_technical_form_key,
  compound_form_key,
  sub_form_number,
  version,
  revision,
  status,
  parts_summary,
  parts_defects,
  result_type,
  result_transport_interruption,
  era_yv_mnt_regnr,
  era_yv_mnt_vintin,
  era_yv_mnt_axles,
  era_yv_mnt_places,
  era_yv_mnt_rebuilt,
  proceeding_type,
  proceeding_reference_number,
  violations,
  notes,
  extraordinary_inspection_date,
  enforcement_decision,
  proceeding_closure_basis,
  klim_clarification_date,
  carrier_explanation_date,
  penalty_valid_until,
  penalty_expired_or_processed,
  akvk_next_meeting_date,
  commission_last_decision_date,
  admin_procedure_decision,
  created_by
)
SELECT
  l.trailer_technical_form_key,
  l.compound_form_key,
  l.sub_form_number,
  l.version,
  l.revision + 1,
  :status,
  l.parts_summary,
  l.parts_defects,
  l.result_type,
  l.result_transport_interruption,
  l.era_yv_mnt_regnr,
  l.era_yv_mnt_vintin,
  l.era_yv_mnt_axles,
  l.era_yv_mnt_places,
  l.era_yv_mnt_rebuilt,
  l.proceeding_type,
  l.proceeding_reference_number,
  l.violations,
  l.notes,
  l.extraordinary_inspection_date,
  l.enforcement_decision,
  l.proceeding_closure_basis,
  l.klim_clarification_date,
  l.carrier_explanation_date,
  l.penalty_valid_until,
  l.penalty_expired_or_processed,
  l.akvk_next_meeting_date,
  l.commission_last_decision_date,
  l.admin_procedure_decision,
  :created_by
FROM latest l
RETURNING trailer_technical_form_key AS id, sub_form_number, compound_form_key;
