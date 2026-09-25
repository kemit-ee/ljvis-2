/*
description: Karistusregistri kasutaja sisestab uusimale kinnitatud ADR vormile menetluse tulemuse.
namespace: control-forms
params:
  key: { type: integer, required: true }
  enforcementDecision: { type: string, required: false }
  proceedingClosureBasis: { type: string, required: false }
returns:
- { name: id, type: number, nullable: true }
*/
UPDATE forms.adr_form t
SET enforcement_decision = NULLIF(btrim(:enforcementDecision), ''),
    proceeding_closure_basis = NULLIF(btrim(:proceedingClosureBasis), '')
WHERE t.id = (SELECT id FROM forms.adr_form WHERE adr_form_key = :key::BIGINT ORDER BY created_at DESC LIMIT 1)
  AND t.status = 'confirmed'
RETURNING adr_form_key AS id;
