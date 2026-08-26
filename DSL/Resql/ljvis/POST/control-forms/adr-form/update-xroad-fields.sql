/*
description: "Update X-tee fields on the latest confirmed ADR sub-form snapshot row in place — does NOT bump version."
namespace: control-forms
params:
  key:
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
UPDATE forms.adr_form
SET
  enforcement_decision    = NULLIF(:enforcementDecision, ''),
  proceeding_closure_basis = NULLIF(:proceedingClosureBasis, '')
WHERE id = (
  SELECT id FROM forms.adr_form
  WHERE adr_form_key = :key::BIGINT
  ORDER BY created_at DESC
  LIMIT 1
)
RETURNING adr_form_key AS id, sub_form_number, version;
