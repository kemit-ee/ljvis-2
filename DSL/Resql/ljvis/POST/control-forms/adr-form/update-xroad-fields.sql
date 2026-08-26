/*
declaration:
  version: 0.1
  description: "Update X-tee fields on the latest confirmed ADR sub-form snapshot row in place — does NOT bump version."
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: key
        type: string
      - field: enforcementDecision
        type: string
      - field: proceedingClosureBasis
        type: string
  response:
    fields:
      - field: id
        type: number
      - field: subFormNumber
        type: string
      - field: version
        type: number
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
