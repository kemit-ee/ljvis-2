/*
description: Update proceeding outcome fields on the latest confirmed teammate drive/rest snapshot.
namespace: control-forms
params:
  key: { type: integer, required: true }
  enforcementDecision: { type: string, required: false }
  proceedingClosureBasis: { type: string, required: false }
returns:
- { name: id, type: number, nullable: true }
*/
UPDATE forms.sp_teammate_form t
SET enforcement_decision = NULLIF(btrim(:enforcementDecision), ''),
    proceeding_closure_basis = NULLIF(btrim(:proceedingClosureBasis), '')
WHERE t.id = (SELECT id FROM forms.sp_teammate_form WHERE sp_teammate_form_key = :key::BIGINT ORDER BY created_at DESC LIMIT 1)
  AND t.status = 'confirmed'
RETURNING sp_teammate_form_key AS id;
