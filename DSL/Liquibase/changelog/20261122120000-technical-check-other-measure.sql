-- liquibase formatted sql
-- changeset ljvis:20261122120000 ignore:true
--
-- Tehnoseisundi kontrollkaart (mootorsõiduk ja haagis): kui punkti 10
-- (veose kinnitamine, CAA_10) all on märgitud VO/OV/EOV viga, ei tohi see
-- automaatselt tekitada erakorralise tehnoülevaatuse/sõidukeelu märget
-- (vt AUTO_RESULT_EXCLUDED_PARTS) — kuid selle vea kõige sagedasem meede on
-- väärteomenetlus või veo katkestamine, mitte "Tehniliselt korras". Lisab
-- omaette "Muu meede" checkbox'i "Kontrolli tulemus" plokis, paralleelselt
-- Sõidukeelu raadionupuga (sõltumatu tulp, mitte result_type väärtus) —
-- sarnaselt transport_interruption_autovs_51_3_1 (20261120130000) juba
-- olemasoleva mustriga. Märke sisselülitamine avab frontendis
-- väärteomenetluse ja veo katkestamise andmeväljad ega mõjuta result_type
-- salvestatud väärtust.

ALTER TABLE forms.vehicle_technical_form
    ADD COLUMN IF NOT EXISTS other_measure BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN forms.vehicle_technical_form.other_measure IS
    'Muu meede — sõltumatu lisameede paralleelselt result_type raadionupuga, kasutusel eelkõige punkti 10 (veose kinnitamine) rikke korral, mis ise result_type'' i ei eskaleeri. Avab frontendis väärteomenetluse/veo katkestamise väljad.';

ALTER TABLE forms.trailer_technical_form
    ADD COLUMN IF NOT EXISTS other_measure BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN forms.trailer_technical_form.other_measure IS
    'Muu meede — sõltumatu lisameede paralleelselt result_type raadionupuga, kasutusel eelkõige punkti 10 (veose kinnitamine) rikke korral, mis ise result_type'' i ei eskaleeri. Avab frontendis väärteomenetluse/veo katkestamise väljad.';
