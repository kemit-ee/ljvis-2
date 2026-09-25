/*
description: Update the proceeding outcome on the latest confirmed TRAM card snapshot.
namespace: control-forms
params:
  key: { type: integer, required: true }
  enforcementDecision: { type: string, required: false }
  proceedingClosureBasis: { type: string, required: false }
returns:
- { name: id, type: number, nullable: true }
*/
UPDATE forms.tram_control_card t
SET enforcement_decision = NULLIF(btrim(:enforcementDecision), ''),
    proceeding_closure_basis = NULLIF(btrim(:proceedingClosureBasis), '')
WHERE t.id = (SELECT id FROM forms.tram_control_card WHERE tram_control_card_key = :key::BIGINT ORDER BY created_at DESC LIMIT 1)
  AND t.status = 'confirmed'
RETURNING tram_control_card_key AS id;
