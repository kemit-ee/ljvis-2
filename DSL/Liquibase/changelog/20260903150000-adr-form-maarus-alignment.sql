-- liquibase formatted sql
-- changeset ljvis:20260903150000 ignore:true splitStatements:false
--
-- forms.adr_form — kliimaministri määruse (RT I, 16.06.2026, 11) lisa 1 kujule
-- viimine (LJVIS2 #232, epic #228). Vt ADR-007 Otsus 3.
--
-- Tabel on append-only hetktõmmete tabel; JSONB-väljade sisemine kuju muutub
-- koodis (infringements -> punktipõhine, records[]-massiiviga), skeemi see ei
-- puuduta. Uued veerud lisatakse siin. Toodangus ADR-vormi andmeid ei ole ->
-- andmemigratsiooni ei tehta; vanad veerud (other_violations, container_type)
-- jäävad ajalukku loetavaks, kuid backend neisse enam ei kirjuta.

ALTER TABLE forms.adr_form
    ADD COLUMN IF NOT EXISTS other_infringements            JSONB   NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS container_types                JSONB   NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS exemption_notes                TEXT,
    ADD COLUMN IF NOT EXISTS driving_ban_applied            BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS transport_interruption_applied BOOLEAN NOT NULL DEFAULT FALSE;

-- result_type: sõidukeeld ja veo katkestamine on nüüd eraldi lisameetmed
-- (driving_ban_applied / transport_interruption_applied), mitte tulemuse väärtus.
ALTER TABLE forms.adr_form DROP CONSTRAINT IF EXISTS chk_adr_result_type;
ALTER TABLE forms.adr_form
    ADD CONSTRAINT chk_adr_result_type
    CHECK (result_type IN ('ok', 'misdemeanor_proceedings', 'warning'));

ALTER TABLE forms.adr_form
    ADD CONSTRAINT chk_adr_other_infringements_length
    CHECK (char_length(other_infringements::text) <= 40000);

COMMENT ON COLUMN forms.adr_form.infringements IS
    'JSONB array, üks kirje kontrollkaardi punkti kohta (ADR_CONTROL_CHECKPOINT tase 1): [{"checkpointCode":"P17","inspectionStatus":"C|NC|NA","notCheckedReason":...,"infringementDetected":true,"records":[{"riskCategory":"I|II|III","adrReference":...,"responsibleParticipants":["C","F"],"reg2016403Code":"10|NONE|null","reg2016403Severity":"MSI|VSI|SI|null"}]}]. Puutumata punkte ei salvestata. reg2016403Code aktiveerub ainult kui responsibleParticipants sisaldab "C" (vedaja); reg2016403Severity tuletatakse koodist ja hoitakse riskCategory-st eraldi.';
COMMENT ON COLUMN forms.adr_form.other_infringements IS
    'JSONB array, §4.10 "Muu rikkumine" (n+1 lisatav). Sama kuju nagu infringements kirje, kuid checkpointCode asemel vabatekst-pealkiri title: [{"title":...,"inspectionStatus":...,"notCheckedReason":...,"infringementDetected":...,"records":[...]}].';
COMMENT ON COLUMN forms.adr_form.container_types IS
    'Mahuti tüüpide massiiv (mitmene valik, §4.9): nt ["paak","pakend"]. Asendab varasema container_type ainsuse veeru.';
COMMENT ON COLUMN forms.adr_form.exemption_notes IS
    '§4.8 "Märkus (direktiivi 2008/68/EÜ erandid)" vabatekst.';
COMMENT ON COLUMN forms.adr_form.driving_ban_applied IS
    '§4.11 lisameede: sõidukeeld (direktiivi (EL) 2022/1999 artikkel 5). Tulemuse valikust sõltumatu.';
COMMENT ON COLUMN forms.adr_form.transport_interruption_applied IS
    '§4.11 lisameede: autovedu on katkestatud. Tulemuse valikust sõltumatu.';
COMMENT ON COLUMN forms.adr_form.result_type IS
    'Kontrolli tulemus: ok, misdemeanor_proceedings, warning. Sõidukeeld ja veo katkestamine on eraldi lisameetmed (driving_ban_applied / transport_interruption_applied).';
