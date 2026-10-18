/*
description: 'Vormi haldusmenetluse andmeploki salvestamine (üks rida vormi kohta, INSERT ... ON CONFLICT). Tühi sõne tähendab tühja välja.'
namespace: control-forms
params:
  formType: { type: string, required: true }
  formKey: { type: integer, required: true }
  klimClarificationDate: { type: string, required: false }
  carrierExplanationDate: { type: string, required: false }
  penaltyValidUntil: { type: string, required: false }
  penaltyExpiredOrProcessed: { type: string, required: false }
  akvkNextMeetingDate: { type: string, required: false }
  commissionLastDecisionDate: { type: string, required: false }
  adminProcedureDecision: { type: string, required: false }
  created_by: { type: string, required: false }
returns:
- { name: id, type: number }
*/
INSERT INTO forms.administrative_procedure (
  form_type, form_key,
  klim_clarification_date, carrier_explanation_date, penalty_valid_until,
  penalty_expired_or_processed, akvk_next_meeting_date,
  commission_last_decision_date, admin_procedure_decision,
  created_by, updated_by
) VALUES (
  :formType, :formKey::BIGINT,
  NULLIF(:klimClarificationDate, '')::DATE,
  NULLIF(:carrierExplanationDate, '')::DATE,
  NULLIF(:penaltyValidUntil, '')::DATE,
  COALESCE(NULLIF(:penaltyExpiredOrProcessed, ''), 'false')::BOOLEAN,
  NULLIF(:akvkNextMeetingDate, '')::DATE,
  NULLIF(:commissionLastDecisionDate, '')::DATE,
  NULLIF(btrim(:adminProcedureDecision), ''),
  COALESCE(NULLIF(:created_by, ''), 'system'),
  COALESCE(NULLIF(:created_by, ''), 'system')
)
ON CONFLICT (form_type, form_key) DO UPDATE SET
  klim_clarification_date       = EXCLUDED.klim_clarification_date,
  carrier_explanation_date      = EXCLUDED.carrier_explanation_date,
  penalty_valid_until           = EXCLUDED.penalty_valid_until,
  penalty_expired_or_processed  = EXCLUDED.penalty_expired_or_processed,
  akvk_next_meeting_date        = EXCLUDED.akvk_next_meeting_date,
  commission_last_decision_date = EXCLUDED.commission_last_decision_date,
  admin_procedure_decision      = EXCLUDED.admin_procedure_decision,
  updated_by                    = EXCLUDED.updated_by,
  updated_at                    = now()
RETURNING form_key AS id;
