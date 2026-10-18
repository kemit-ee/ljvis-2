/*
description: 'Vormi haldusmenetluse andmeploki lugemine (PPA andmevormid ja TRAM kontrollkaart). Rida puudub, kui plokki pole veel täidetud.'
namespace: control-forms
params:
  formType: { type: string, required: true }
  formKey: { type: integer, required: true }
returns:
- { name: klimClarificationDate, type: string, nullable: true }
- { name: carrierExplanationDate, type: string, nullable: true }
- { name: penaltyValidUntil, type: string, nullable: true }
- { name: penaltyExpiredOrProcessed, type: boolean }
- { name: akvkNextMeetingDate, type: string, nullable: true }
- { name: commissionLastDecisionDate, type: string, nullable: true }
- { name: adminProcedureDecision, type: string, nullable: true }
*/
SELECT
  klim_clarification_date::TEXT AS klim_clarification_date,
  carrier_explanation_date::TEXT AS carrier_explanation_date,
  penalty_valid_until::TEXT AS penalty_valid_until,
  penalty_expired_or_processed,
  akvk_next_meeting_date::TEXT AS akvk_next_meeting_date,
  commission_last_decision_date::TEXT AS commission_last_decision_date,
  admin_procedure_decision
FROM forms.administrative_procedure
WHERE form_type = :formType
  AND form_key = :formKey::BIGINT;
