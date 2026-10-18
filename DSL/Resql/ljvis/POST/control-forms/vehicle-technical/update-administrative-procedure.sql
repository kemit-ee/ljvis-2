/*
description: 'Haldusmenetluse andmeploki salvestamine (vehicle-technical). INSERT-only: lisab uue snapshot-rea (revision + 1,
  version, staatus ja kõik muud väljad kantakse edasi), vana rida jääb ajalukku. Kustutatud vormile ei kirjuta.
  Tühi sõne tähendab tühja välja; created_by on tegutsev kasutaja (tühi → ''system'').'
namespace: control-forms
params:
  key: { type: integer, required: true }
  klimClarificationDate: { type: string, required: false }
  carrierExplanationDate: { type: string, required: false }
  penaltyValidUntil: { type: string, required: false }
  penaltyExpiredOrProcessed: { type: string, required: false }
  akvkNextMeetingDate: { type: string, required: false }
  commissionLastDecisionDate: { type: string, required: false }
  adminProcedureDecision: { type: string, required: false }
  created_by: { type: string, required: false }
returns:
- { name: id, type: number, nullable: true }
*/
WITH latest AS (
  SELECT *
  FROM forms.vehicle_technical_form
  WHERE vehicle_technical_form_key = :key::BIGINT
  ORDER BY created_at DESC
  LIMIT 1
)
INSERT INTO forms.vehicle_technical_form
SELECT (jsonb_populate_record(
    NULL::forms.vehicle_technical_form,
    to_jsonb(l) || jsonb_build_object(
      'id', nextval('forms.vehicle_technical_form_id_seq'),
      'revision', l.revision + 1,
      'created_at', now(),
      'created_by', COALESCE(NULLIF(:created_by, ''), 'system'),
      'klim_clarification_date', NULLIF(:klimClarificationDate, ''),
      'carrier_explanation_date', NULLIF(:carrierExplanationDate, ''),
      'penalty_valid_until', NULLIF(:penaltyValidUntil, ''),
      'penalty_expired_or_processed', COALESCE(NULLIF(:penaltyExpiredOrProcessed, ''), 'false')::BOOLEAN,
      'akvk_next_meeting_date', NULLIF(:akvkNextMeetingDate, ''),
      'commission_last_decision_date', NULLIF(:commissionLastDecisionDate, ''),
      'admin_procedure_decision', NULLIF(btrim(:adminProcedureDecision), '')
    )
)).*
FROM latest l
WHERE l.status <> 'deleted'
RETURNING vehicle_technical_form_key AS id;
