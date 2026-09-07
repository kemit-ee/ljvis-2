-- liquibase formatted sql
-- changeset ljvis:20261101120000 ignore:true splitStatements:false
--
-- VR-kontrollkaart: NCR sõnumi viide.
-- RS ettepanek (18.05.2026): VR kontrollkaart peaks olema loodav NCR lehelt.
-- Lisame VR vormi küljele viite NCR sõnumile, millest vorm loodi.
-- NCR pool viitab VR-le läbi erru.ncr_message.linked_foreign_violation_form_key
-- (on juba andmebaasis olemas). VR pool saab nüüd viite tagasi.
--
-- NB: erru.ncr_message on INSERT-only snapshot-tabel — ncr_message_key EI OLE
-- unikaalne (üks võti = mitu snapshot-rida), seega FOREIGN KEY sinna ei ole
-- võimalik. Salvestame loogilise võtme pehme viitena (nagu erru_message_id
-- juba salvestab business_case_id-d).
--

ALTER TABLE forms.foreign_violation_form
    ADD COLUMN IF NOT EXISTS erru_ncr_message_key BIGINT;

COMMENT ON COLUMN forms.foreign_violation_form.erru_ncr_message_key IS
    'Optional soft reference to erru.ncr_message.ncr_message_key (the logical '
    'message identity, not unique) from which this VR control card was created. '
    'RS proposal 18.05.2026.';
