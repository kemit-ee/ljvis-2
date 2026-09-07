-- liquibase formatted sql
-- changeset ljvis:20261101110000-rollback splitStatements:false
ALTER TABLE forms.foreign_violation_form
    DROP COLUMN IF EXISTS klim_clarification_date,
    DROP COLUMN IF EXISTS carrier_explanation_date,
    DROP COLUMN IF EXISTS penalty_valid_until,
    DROP COLUMN IF EXISTS penalty_expired_or_processed,
    DROP COLUMN IF EXISTS akvk_next_meeting_date,
    DROP COLUMN IF EXISTS commission_last_decision_date,
    DROP COLUMN IF EXISTS admin_procedure_decision,
    DROP COLUMN IF EXISTS foreign_authority_proposal,
    DROP COLUMN IF EXISTS notify_carrier;
