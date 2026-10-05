/*
description: 'Karistusregistri kasutaja sisestab uusimale kinnitatud TRAM kontrollkaardile menetluse tulemuse.
  INSERT-only: lisab uue snapshot-rea (revision + 1, version ja kõik muud väljad kantakse edasi), vana rida
  jääb ajalukku. Staatus jääb ''confirmed''; created_by on tegutsev kasutaja (tühi → ''system'').'
namespace: control-forms
params:
  key: { type: integer, required: true }
  enforcementDecision: { type: string, required: false }
  proceedingClosureBasis: { type: string, required: false }
  created_by: { type: string, required: false }
returns:
- { name: id, type: number, nullable: true }
*/
WITH latest AS (
  SELECT *
  FROM forms.tram_control_card
  WHERE tram_control_card_key = :key::BIGINT
  ORDER BY created_at DESC
  LIMIT 1
)
INSERT INTO forms.tram_control_card
SELECT (jsonb_populate_record(
    NULL::forms.tram_control_card,
    to_jsonb(l) || jsonb_build_object(
      'id', nextval('forms.tram_control_card_id_seq'),
      'revision', l.revision + 1,
      'created_at', now(),
      'created_by', COALESCE(NULLIF(:created_by, ''), 'system'),
      'enforcement_decision', NULLIF(btrim(:enforcementDecision), ''),
      'proceeding_closure_basis', NULLIF(btrim(:proceedingClosureBasis), '')
    )
)).*
FROM latest l
WHERE l.status = 'confirmed'
RETURNING tram_control_card_key AS id;
