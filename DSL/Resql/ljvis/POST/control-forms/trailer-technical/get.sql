/*
description: "Get trailer technical-check sub-form by ID (latest snapshot)"
namespace: control-forms
params:
  id:
    type: string
    required: false
returns:
  - name: id
    type: string
    nullable: true
  - name: compoundFormKey
    type: number
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
  - name: eraYvMntRegnr
    type: string
    nullable: true
  - name: eraYvMntVintin
    type: string
    nullable: true
  - name: eraYvMntAxles
    type: string
    nullable: true
  - name: eraYvMntPlaces
    type: string
    nullable: true
  - name: eraYvMntRebuilt
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
FROM forms.trailer_technical_form
WHERE trailer_technical_form_key = :id::BIGINT
ORDER BY created_at DESC
LIMIT 1;
