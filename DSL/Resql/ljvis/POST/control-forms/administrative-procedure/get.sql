/*
description: 'Vormi haldusmenetluse andmeploki lugemine uusimast snapshot-realt (PPA andmevormid ja TRAM kontrollkaart). Rida puudub, kui vormi pole.'
namespace: control-forms
params:
  formType: { type: string, required: true }
  formKey: { type: integer, required: true }
returns:
- { name: klimClarificationDate, type: string, nullable: true }
- { name: carrierExplanationDate, type: string, nullable: true }
- { name: penaltyValidUntil, type: string, nullable: true }
- { name: penaltyExpiredOrProcessed, type: boolean, nullable: true }
- { name: akvkNextMeetingDate, type: string, nullable: true }
- { name: commissionLastDecisionDate, type: string, nullable: true }
- { name: adminProcedureDecision, type: string, nullable: true }
*/
  (SELECT klim_clarification_date::TEXT AS klim_clarification_date,
          carrier_explanation_date::TEXT AS carrier_explanation_date,
          penalty_valid_until::TEXT AS penalty_valid_until,
          penalty_expired_or_processed,
          akvk_next_meeting_date::TEXT AS akvk_next_meeting_date,
          commission_last_decision_date::TEXT AS commission_last_decision_date,
          admin_procedure_decision
   FROM forms.adr_form
   WHERE :formType = 'adr-form' AND adr_form_key = :formKey::BIGINT
   ORDER BY created_at DESC
   LIMIT 1)
UNION ALL
  (SELECT klim_clarification_date::TEXT AS klim_clarification_date,
          carrier_explanation_date::TEXT AS carrier_explanation_date,
          penalty_valid_until::TEXT AS penalty_valid_until,
          penalty_expired_or_processed,
          akvk_next_meeting_date::TEXT AS akvk_next_meeting_date,
          commission_last_decision_date::TEXT AS commission_last_decision_date,
          admin_procedure_decision
   FROM forms.sp_driver_form
   WHERE :formType = 'drive-rest-form/driver' AND sp_driver_form_key = :formKey::BIGINT
   ORDER BY created_at DESC
   LIMIT 1)
UNION ALL
  (SELECT klim_clarification_date::TEXT AS klim_clarification_date,
          carrier_explanation_date::TEXT AS carrier_explanation_date,
          penalty_valid_until::TEXT AS penalty_valid_until,
          penalty_expired_or_processed,
          akvk_next_meeting_date::TEXT AS akvk_next_meeting_date,
          commission_last_decision_date::TEXT AS commission_last_decision_date,
          admin_procedure_decision
   FROM forms.sp_teammate_form
   WHERE :formType = 'drive-rest-form/teammate' AND sp_teammate_form_key = :formKey::BIGINT
   ORDER BY created_at DESC
   LIMIT 1)
UNION ALL
  (SELECT klim_clarification_date::TEXT AS klim_clarification_date,
          carrier_explanation_date::TEXT AS carrier_explanation_date,
          penalty_valid_until::TEXT AS penalty_valid_until,
          penalty_expired_or_processed,
          akvk_next_meeting_date::TEXT AS akvk_next_meeting_date,
          commission_last_decision_date::TEXT AS commission_last_decision_date,
          admin_procedure_decision
   FROM forms.trailer_technical_form
   WHERE :formType = 'trailer-technical' AND trailer_technical_form_key = :formKey::BIGINT
   ORDER BY created_at DESC
   LIMIT 1)
UNION ALL
  (SELECT klim_clarification_date::TEXT AS klim_clarification_date,
          carrier_explanation_date::TEXT AS carrier_explanation_date,
          penalty_valid_until::TEXT AS penalty_valid_until,
          penalty_expired_or_processed,
          akvk_next_meeting_date::TEXT AS akvk_next_meeting_date,
          commission_last_decision_date::TEXT AS commission_last_decision_date,
          admin_procedure_decision
   FROM forms.tram_control_card
   WHERE :formType = 'tram-card' AND tram_control_card_key = :formKey::BIGINT
   ORDER BY created_at DESC
   LIMIT 1)
UNION ALL
  (SELECT klim_clarification_date::TEXT AS klim_clarification_date,
          carrier_explanation_date::TEXT AS carrier_explanation_date,
          penalty_valid_until::TEXT AS penalty_valid_until,
          penalty_expired_or_processed,
          akvk_next_meeting_date::TEXT AS akvk_next_meeting_date,
          commission_last_decision_date::TEXT AS commission_last_decision_date,
          admin_procedure_decision
   FROM forms.vehicle_technical_form
   WHERE :formType = 'vehicle-technical' AND vehicle_technical_form_key = :formKey::BIGINT
   ORDER BY created_at DESC
   LIMIT 1);
