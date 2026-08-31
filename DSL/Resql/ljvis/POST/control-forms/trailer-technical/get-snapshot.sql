/*
declaration:
  version: 0.1
  description: "Get a single trailer technical-check form snapshot by snapshot ID"
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
        description: "Trailer technical form key"
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
      - field: trailerRegNr
        type: string
      - field: createdBy
        type: string
*/
SELECT
  trailer_technical_form_key AS id,
  sub_form_number,
  version,
  status,
  parts_summary::text,
  parts_defects::text,
  result_type,
  result_transport_interruption,
  proceeding_type,
  proceeding_reference_number,
  violations::text,
  notes,
  extraordinary_inspection_date,
  enforcement_decision,
  proceeding_closure_basis,
  trailer_reg_nr,
  created_by
FROM forms.trailer_technical_form
WHERE id = :id::BIGINT
  AND trailer_technical_form_key = :form_key::BIGINT;
