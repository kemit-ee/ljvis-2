/*
description: "Delete trailer technical-check sub-form — copy latest snapshot with status=deleted"
namespace: control-forms
params:
  id:
    type: number
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
  SELECT DISTINCT ON (trailer_technical_form_key)
    trailer_technical_form_key,
    compound_form_key,
    sub_form_number,
    version,
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
    proceeding_closure_basis
  FROM forms.trailer_technical_form
  WHERE trailer_technical_form_key = :id::BIGINT
  ORDER BY trailer_technical_form_key, created_at DESC
)
INSERT INTO forms.trailer_technical_form (
  trailer_technical_form_key,
  compound_form_key,
  sub_form_number,
  version,
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
  created_by
)
SELECT
  l.trailer_technical_form_key,
  l.compound_form_key,
  l.sub_form_number,
  l.version,
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
  :created_by
FROM latest l
RETURNING trailer_technical_form_key AS id, sub_form_number;
