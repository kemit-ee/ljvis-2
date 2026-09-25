/*
description: Karistusregistri kasutaja sisestab uusimale kinnitatud haagise tehnovormile menetluse tulemuse.
namespace: control-forms
params:
  key: { type: integer, required: true }
  enforcementDecision: { type: string, required: false }
  proceedingClosureBasis: { type: string, required: false }
returns:
- { name: id, type: number, nullable: true }
*/
UPDATE forms.trailer_technical_form t
SET enforcement_decision = NULLIF(btrim(:enforcementDecision), ''),
    proceeding_closure_basis = NULLIF(btrim(:proceedingClosureBasis), '')
WHERE t.id = (SELECT id FROM forms.trailer_technical_form WHERE trailer_technical_form_key = :key::BIGINT ORDER BY created_at DESC LIMIT 1)
  AND t.status = 'confirmed'
RETURNING trailer_technical_form_key AS id;
