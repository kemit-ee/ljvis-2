-- liquibase formatted sql
-- changeset ljvis:20261124120000 ignore:true splitStatements:false
--
-- VR-kontrollkaart: teavituse saatmise refaktor (NCR->kaart andmeülekande
-- testimise plaan, p.5). Kliendi soov: teavitus tööinspektorile saadetakse
-- eraldi märkeruuduga, mitte foreign_authority_proposal ("saabus välisriigi
-- ettepanek") faktiväljaga — need on semantiliselt erinevad (üks kirjeldab
-- ajaloolist fakti, teine on saatmise päästik).
--
-- Saatmise ajalugu (kuupäevad) EI vaja uut veergu/JSONB — notifications.outbound_log
-- on juba append-only (iga saatmiskatse, sh kordussaatmine, eraldi rida),
-- piisab related_entity_type='foreign_violation_form' AND related_entity_id=<id>
-- päringust (vt list_outbound_log.sql).
--

ALTER TABLE forms.foreign_violation_form
    ADD COLUMN IF NOT EXISTS notify_labor_inspector BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN forms.foreign_violation_form.notify_labor_inspector IS
    'Teavituste plokk: saada teavitus tööinspektorile. Saatmine käivitub save.yml-is'
    ' false->true üleminekul (vt edit/save.yml) ja lipp lülitatakse update''i sees kohe'
    ' tagasi false-ks — saatmise fakt/kuupäev säilib notifications.outbound_log-is,'
    ' mitte siin. Eraldiseisev foreign_authority_proposal veerust, mis kirjeldab fakti'
    ' "saabus välisriigi pädeva asutuse ettepanek", mitte saatmispäästikut.';
