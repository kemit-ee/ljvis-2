/*
declaration:
  version: 0.1
  description: "Get a single vehicle technical-check form snapshot by snapshot ID"
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: id
        type: string
        description: "Snapshot ID (primary key)"
      - field: form_key
        type: string
        description: "Vehicle technical form key"
  response:
    fields:
      - field: id
        type: string
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
WHERE id = :id::BIGINT
  AND vehicle_technical_form_key = :form_key::BIGINT;
