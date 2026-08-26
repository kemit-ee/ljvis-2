/*
declaration:
  version: 0.1
  description: "Get vehicle technical-check sub-form by ID (latest snapshot)"
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: id
        type: string
  response:
    fields:
      - field: id
        type: string
      - field: compoundFormKey
        type: number
      - field: subFormNumber
        type: string
      - field: version
        type: number
      - field: status
        type: string
      - field: partsSummary
        type: string
      - field: partsDefects
        type: string
      - field: resultType
        type: string
      - field: resultTransportInterruption
        type: string
      - field: eraYvMntRegnr
        type: string
      - field: eraYvMntVintin
        type: string
      - field: eraYvMntAxles
        type: string
      - field: eraYvMntPlaces
        type: string
      - field: eraYvMntRebuilt
        type: string
      - field: proceedingType
        type: string
      - field: proceedingReferenceNumber
        type: string
      - field: violations
        type: string
      - field: notes
        type: string
      - field: extraordinaryInspectionDate
        type: string
      - field: enforcementDecision
        type: string
      - field: proceedingClosureBasis
        type: string
      - field: createdBy
        type: string
*/
SELECT
  vehicle_technical_form_key AS id,
  compound_form_key,
  sub_form_number,
  version,
  status,
  parts_summary::text,
  parts_defects::text,
  result_type,
  result_transport_interruption,
  era_yv_mnt_regnr,
  era_yv_mnt_vintin,
  era_yv_mnt_axles,
  era_yv_mnt_places,
  era_yv_mnt_rebuilt,
  proceeding_type,
  proceeding_reference_number,
  violations::text,
  notes,
  extraordinary_inspection_date,
  enforcement_decision,
  proceeding_closure_basis,
  created_by
FROM forms.vehicle_technical_form
WHERE vehicle_technical_form_key = :id::BIGINT
ORDER BY created_at DESC
LIMIT 1;
