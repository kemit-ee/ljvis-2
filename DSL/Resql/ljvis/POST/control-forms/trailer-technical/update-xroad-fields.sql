/*
description: "Update the X-tee block fields IN PLACE on the latest snapshot row of a trailer technical-check sub-form. Does not append a new snapshot and does not bump version (LJVIS2-72 §4). Caller (Ruuter .guard) must already have verified control_form.edit_locked and that the latest snapshot status is confirmed."
namespace: control-forms
params:
  key:
    type: number
    required: false
  extraordinaryInspectionDate:
    type: string
    required: false
  enforcementDecision:
    type: string
    required: false
  proceedingClosureBasis:
    type: string
    required: false
returns:
  - name: id
    type: number
    nullable: true
  - name: subFormNumber
    type: string
    nullable: true
  - name: version
    type: number
    nullable: true
*/
WITH latest AS (
  SELECT id
  FROM forms.trailer_technical_form
  WHERE trailer_technical_form_key = :key::BIGINT
  ORDER BY created_at DESC
  LIMIT 1
)
UPDATE forms.trailer_technical_form t
SET extraordinary_inspection_date = NULLIF(:extraordinaryInspectionDate, '')::DATE,
    enforcement_decision = NULLIF(:enforcementDecision, ''),
    proceeding_closure_basis = NULLIF(:proceedingClosureBasis, '')
FROM latest
WHERE t.id = latest.id
RETURNING t.trailer_technical_form_key AS id, t.sub_form_number, t.version;
