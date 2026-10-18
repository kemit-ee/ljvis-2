-- liquibase formatted sql
-- changeset ljvis:20261217100000-rollback ignore:true

ALTER TABLE forms.adr_form
    DROP COLUMN IF EXISTS klim_clarification_date,
    DROP COLUMN IF EXISTS carrier_explanation_date,
    DROP COLUMN IF EXISTS penalty_valid_until,
    DROP COLUMN IF EXISTS penalty_expired_or_processed,
    DROP COLUMN IF EXISTS akvk_next_meeting_date,
    DROP COLUMN IF EXISTS commission_last_decision_date,
    DROP COLUMN IF EXISTS admin_procedure_decision;

ALTER TABLE forms.sp_driver_form
    DROP COLUMN IF EXISTS klim_clarification_date,
    DROP COLUMN IF EXISTS carrier_explanation_date,
    DROP COLUMN IF EXISTS penalty_valid_until,
    DROP COLUMN IF EXISTS penalty_expired_or_processed,
    DROP COLUMN IF EXISTS akvk_next_meeting_date,
    DROP COLUMN IF EXISTS commission_last_decision_date,
    DROP COLUMN IF EXISTS admin_procedure_decision;

ALTER TABLE forms.sp_teammate_form
    DROP COLUMN IF EXISTS klim_clarification_date,
    DROP COLUMN IF EXISTS carrier_explanation_date,
    DROP COLUMN IF EXISTS penalty_valid_until,
    DROP COLUMN IF EXISTS penalty_expired_or_processed,
    DROP COLUMN IF EXISTS akvk_next_meeting_date,
    DROP COLUMN IF EXISTS commission_last_decision_date,
    DROP COLUMN IF EXISTS admin_procedure_decision;

ALTER TABLE forms.trailer_technical_form
    DROP COLUMN IF EXISTS klim_clarification_date,
    DROP COLUMN IF EXISTS carrier_explanation_date,
    DROP COLUMN IF EXISTS penalty_valid_until,
    DROP COLUMN IF EXISTS penalty_expired_or_processed,
    DROP COLUMN IF EXISTS akvk_next_meeting_date,
    DROP COLUMN IF EXISTS commission_last_decision_date,
    DROP COLUMN IF EXISTS admin_procedure_decision;

ALTER TABLE forms.tram_control_card
    DROP COLUMN IF EXISTS klim_clarification_date,
    DROP COLUMN IF EXISTS carrier_explanation_date,
    DROP COLUMN IF EXISTS penalty_valid_until,
    DROP COLUMN IF EXISTS penalty_expired_or_processed,
    DROP COLUMN IF EXISTS akvk_next_meeting_date,
    DROP COLUMN IF EXISTS commission_last_decision_date,
    DROP COLUMN IF EXISTS admin_procedure_decision;

ALTER TABLE forms.vehicle_technical_form
    DROP COLUMN IF EXISTS klim_clarification_date,
    DROP COLUMN IF EXISTS carrier_explanation_date,
    DROP COLUMN IF EXISTS penalty_valid_until,
    DROP COLUMN IF EXISTS penalty_expired_or_processed,
    DROP COLUMN IF EXISTS akvk_next_meeting_date,
    DROP COLUMN IF EXISTS commission_last_decision_date,
    DROP COLUMN IF EXISTS admin_procedure_decision;
