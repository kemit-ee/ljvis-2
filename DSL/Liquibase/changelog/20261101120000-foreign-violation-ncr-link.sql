-- liquibase formatted sql
-- changeset ljvis:20261101120000 splitStatements:false
--
-- VR-kontrollkaart: NCR sõnumi viide.
-- RS ettepanek (18.05.2026): VR kontrollkaart peaks olema loodav NCR lehelt.
-- Lisame VR vormi küljele viite NCR sõnumile, millest vorm loodi.
-- NCR pool viitab VR-le läbi erru.ncr_message.linked_foreign_violation_form_key
-- (on juba andmebaasis olemas). VR pool saab nüüd viite tagasi.
--

ALTER TABLE forms.foreign_violation_form
    ADD COLUMN IF NOT EXISTS erru_ncr_message_key BIGINT REFERENCES erru.ncr_message(ncr_message_key) ON DELETE SET NULL;

COMMENT ON COLUMN forms.foreign_violation_form.erru_ncr_message_key IS
    'Optional reference to the ERRU NCR message (erru.ncr_message) from which this '
    'VR control card was created. RS proposal 18.05.2026.';
