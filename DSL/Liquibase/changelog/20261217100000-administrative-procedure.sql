-- liquibase formatted sql
-- changeset ljvis:20261217100000 ignore:true splitStatements:false
--
-- Haldusmenetluse andmeplokk ("Haldusmenetlus seoses raskete autoveoalaste
-- rikkumistega") PPA andmevormidele (juht, meeskonnaliige, sõiduk, haagis, ADR)
-- ja Transpordiameti kontrollkaardile; samad 7 veergu mis VR-kaardil
-- (20261101110000). Tabelid on append-only: plokk salvestatakse uue
-- snapshot-reana (update-administrative-procedure.sql), vormi enda salvestus
-- kannab väärtused edasi.
-- Nähtav ja täidetav TRAM/KLIM ametnikule ning administraatorile (use-case I-44).

ALTER TABLE forms.adr_form
    ADD COLUMN IF NOT EXISTS klim_clarification_date        DATE,
    ADD COLUMN IF NOT EXISTS carrier_explanation_date       DATE,
    ADD COLUMN IF NOT EXISTS penalty_valid_until            DATE,
    ADD COLUMN IF NOT EXISTS penalty_expired_or_processed   BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS akvk_next_meeting_date         DATE,
    ADD COLUMN IF NOT EXISTS commission_last_decision_date  DATE,
    ADD COLUMN IF NOT EXISTS admin_procedure_decision       TEXT;

ALTER TABLE forms.sp_driver_form
    ADD COLUMN IF NOT EXISTS klim_clarification_date        DATE,
    ADD COLUMN IF NOT EXISTS carrier_explanation_date       DATE,
    ADD COLUMN IF NOT EXISTS penalty_valid_until            DATE,
    ADD COLUMN IF NOT EXISTS penalty_expired_or_processed   BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS akvk_next_meeting_date         DATE,
    ADD COLUMN IF NOT EXISTS commission_last_decision_date  DATE,
    ADD COLUMN IF NOT EXISTS admin_procedure_decision       TEXT;

ALTER TABLE forms.sp_teammate_form
    ADD COLUMN IF NOT EXISTS klim_clarification_date        DATE,
    ADD COLUMN IF NOT EXISTS carrier_explanation_date       DATE,
    ADD COLUMN IF NOT EXISTS penalty_valid_until            DATE,
    ADD COLUMN IF NOT EXISTS penalty_expired_or_processed   BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS akvk_next_meeting_date         DATE,
    ADD COLUMN IF NOT EXISTS commission_last_decision_date  DATE,
    ADD COLUMN IF NOT EXISTS admin_procedure_decision       TEXT;

ALTER TABLE forms.trailer_technical_form
    ADD COLUMN IF NOT EXISTS klim_clarification_date        DATE,
    ADD COLUMN IF NOT EXISTS carrier_explanation_date       DATE,
    ADD COLUMN IF NOT EXISTS penalty_valid_until            DATE,
    ADD COLUMN IF NOT EXISTS penalty_expired_or_processed   BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS akvk_next_meeting_date         DATE,
    ADD COLUMN IF NOT EXISTS commission_last_decision_date  DATE,
    ADD COLUMN IF NOT EXISTS admin_procedure_decision       TEXT;

ALTER TABLE forms.tram_control_card
    ADD COLUMN IF NOT EXISTS klim_clarification_date        DATE,
    ADD COLUMN IF NOT EXISTS carrier_explanation_date       DATE,
    ADD COLUMN IF NOT EXISTS penalty_valid_until            DATE,
    ADD COLUMN IF NOT EXISTS penalty_expired_or_processed   BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS akvk_next_meeting_date         DATE,
    ADD COLUMN IF NOT EXISTS commission_last_decision_date  DATE,
    ADD COLUMN IF NOT EXISTS admin_procedure_decision       TEXT;

ALTER TABLE forms.vehicle_technical_form
    ADD COLUMN IF NOT EXISTS klim_clarification_date        DATE,
    ADD COLUMN IF NOT EXISTS carrier_explanation_date       DATE,
    ADD COLUMN IF NOT EXISTS penalty_valid_until            DATE,
    ADD COLUMN IF NOT EXISTS penalty_expired_or_processed   BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS akvk_next_meeting_date         DATE,
    ADD COLUMN IF NOT EXISTS commission_last_decision_date  DATE,
    ADD COLUMN IF NOT EXISTS admin_procedure_decision       TEXT;
