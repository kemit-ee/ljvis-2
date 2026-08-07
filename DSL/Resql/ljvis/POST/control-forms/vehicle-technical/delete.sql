/*
declaration:
  version: 0.1
  description: "Delete vehicle technical-check sub-form — copies latest snapshot with status=deleted"
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: id
        type: string
      - field: status
        type: string
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
      - field: subFormNumber
        type: string
*/
WITH latest AS (
  SELECT DISTINCT ON (vehicle_technical_form_key)
    vehicle_technical_form_key,
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
  FROM forms.vehicle_technical_form
  WHERE vehicle_technical_form_key = :id::BIGINT
  ORDER BY vehicle_technical_form_key, created_at DESC
)
INSERT INTO forms.vehicle_technical_form (
  vehicle_technical_form_key,
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
  l.vehicle_technical_form_key,
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
RETURNING vehicle_technical_form_key AS id, sub_form_number;
