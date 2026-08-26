/*
description: "Get a single trailer technical-check form snapshot by snapshot ID"
namespace: control-forms
params:
  id:
    type: string
    required: false
    description: "Snapshot ID (primary key)"
  form_key:
    type: string
    required: false
    description: "Trailer technical form key"
returns:
  - name: id
    type: string
    nullable: true
  - name: subFormNumber
    type: string
    nullable: true
  - name: version
    type: number
    nullable: true
  - name: status
    type: string
    nullable: true
  - name: partsSummary
    type: string
    nullable: true
  - name: partsDefects
    type: string
    nullable: true
  - name: resultType
    type: string
    nullable: true
  - name: resultTransportInterruption
    type: string
    nullable: true
  - name: proceedingType
    type: string
    nullable: true
  - name: proceedingReferenceNumber
    type: string
    nullable: true
  - name: violations
    type: string
    nullable: true
  - name: notes
    type: string
    nullable: true
  - name: extraordinaryInspectionDate
    type: string
    nullable: true
  - name: enforcementDecision
    type: string
    nullable: true
  - name: proceedingClosureBasis
    type: string
    nullable: true
  - name: createdBy
    type: string
    nullable: true
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
  created_by
FROM forms.trailer_technical_form
WHERE id = :id::BIGINT
  AND trailer_technical_form_key = :form_key::BIGINT;
