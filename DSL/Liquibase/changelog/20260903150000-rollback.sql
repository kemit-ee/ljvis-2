-- liquibase formatted sql
-- changeset ljvis:20260903150000-rollback ignore:true splitStatements:false
--
-- Rollback 20260903150000: eemaldab kliimaministri määruse vormi veerud ja
-- taastab varasema result_type CHECK-i.

ALTER TABLE forms.adr_form DROP CONSTRAINT IF EXISTS chk_adr_other_infringements_length;
ALTER TABLE forms.adr_form DROP CONSTRAINT IF EXISTS chk_adr_result_type;
ALTER TABLE forms.adr_form
    ADD CONSTRAINT chk_adr_result_type
    CHECK (result_type IN ('ok', 'misdemeanor_proceedings', 'warning', 'driving_ban_art5', 'transport_interruption'));

ALTER TABLE forms.adr_form
    DROP COLUMN IF EXISTS other_infringements,
    DROP COLUMN IF EXISTS container_types,
    DROP COLUMN IF EXISTS exemption_notes,
    DROP COLUMN IF EXISTS driving_ban_applied,
    DROP COLUMN IF EXISTS transport_interruption_applied;
