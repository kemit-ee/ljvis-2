-- liquibase formatted sql
-- changeset ljvis:20261101110000 splitStatements:false
--
-- VR-kontrollkaart: Haldusmenetlus seoses raskete autoveoalaste rikkumistega.
-- RS ettepanek (18.05.2026): andmeplokk "Haldusmenetlus..." peab ilmuma
-- vr-kontrollkaardile pärast avalikustamist (nagu live-süsteemis).
-- Sisaldab 9 välja: KLIM selgitustaotluse kp, vedaja seletuse kp, karistuse
-- kehtivuse kp + märkeruut, AKVK koosoleku kp, komisjoni otsuse kp, otsuse
-- tekst ja kaks boolean märkeruutu.
-- Nähtav ainult ametnikule (mitte kodanikule/vedajale).
--

ALTER TABLE forms.foreign_violation_form
    ADD COLUMN IF NOT EXISTS klim_clarification_date        DATE,
    ADD COLUMN IF NOT EXISTS carrier_explanation_date       DATE,
    ADD COLUMN IF NOT EXISTS penalty_valid_until            DATE,
    ADD COLUMN IF NOT EXISTS penalty_expired_or_processed   BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS akvk_next_meeting_date         DATE,
    ADD COLUMN IF NOT EXISTS commission_last_decision_date  DATE,
    ADD COLUMN IF NOT EXISTS admin_procedure_decision       TEXT,
    ADD COLUMN IF NOT EXISTS foreign_authority_proposal     BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS notify_carrier                 BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN forms.foreign_violation_form.klim_clarification_date      IS 'Haldusmenetlus: KLIM selgitustaotluse kuupäev';
COMMENT ON COLUMN forms.foreign_violation_form.carrier_explanation_date     IS 'Haldusmenetlus: Vedaja seletuse kuupäev';
COMMENT ON COLUMN forms.foreign_violation_form.penalty_valid_until          IS 'Haldusmenetlus: Karistus kehtib kuni';
COMMENT ON COLUMN forms.foreign_violation_form.penalty_expired_or_processed IS 'Haldusmenetlus: Kehtetu või menetletud';
COMMENT ON COLUMN forms.foreign_violation_form.akvk_next_meeting_date       IS 'Haldusmenetlus: Järgmise komisjoni koosolek (AKVK)';
COMMENT ON COLUMN forms.foreign_violation_form.commission_last_decision_date IS 'Haldusmenetlus: Viimase komisjoni otsuse kuupäev';
COMMENT ON COLUMN forms.foreign_violation_form.admin_procedure_decision     IS 'Haldusmenetlus: Otsus (vabatekst)';
COMMENT ON COLUMN forms.foreign_violation_form.foreign_authority_proposal   IS 'Haldusmenetlus: Saabus välisriigi pädeva asutuse ettepanek vedaja kontrollimiseks';
COMMENT ON COLUMN forms.foreign_violation_form.notify_carrier               IS 'Haldusmenetlus: Teavita vedajat rikkumisest';
