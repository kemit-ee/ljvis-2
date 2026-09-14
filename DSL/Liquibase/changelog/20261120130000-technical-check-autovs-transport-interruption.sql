-- liquibase formatted sql
-- changeset ljvis:20261120130000 ignore:true
--
-- LJVIS2-72 15 ettepanekut, p6: "Autovedu on katkestatud AutoVS § 51 lõike 3
-- punkti 1 alusel" lisameede. Vana süsteemi kontrollikaardil (vt PR #359
-- kirjelduse taustaks kasutatud "rikete loetelu" PDF) on see omaette
-- checkbox "Kontrolli tulemus" plokis, paralleelselt Sõidukeelu ja
-- väärteomenetlusega — sõltumatu tulbast result_transport_interruption
-- (mis on hetkel nestitud result_type='driving_ban' alla, kasutaja p6 järgi
-- vale koht). Uus tulp kuvatakse frontendis menetluse liigi sektsiooni
-- juures, saab olla sees paralleelselt mistahes menetlusliigi/meetmega.
--
-- p9/p15 (X-tee väljad, haagise identifitseerimine) ei vaja uusi tulpasid —
-- enforcement_decision/proceeding_closure_basis/extraordinary_inspection_date
-- on juba olemas (20260803150000) ja trailer_reg_nr samuti (20260826110000);
-- ülejäänu on Ruuter/cron-automatiseerimise küsimus, mitte skeemi küsimus.

ALTER TABLE forms.vehicle_technical_form
    ADD COLUMN IF NOT EXISTS transport_interruption_autovs_51_3_1 BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN forms.vehicle_technical_form.transport_interruption_autovs_51_3_1 IS
    'Autovedu on katkestatud autoveoseaduse § 51 lõike 3 punkti 1 alusel — sõltumatu lisameede, ei ole seotud result_type/result_transport_interruption-iga. Kuvatakse menetluse liigi sektsiooni juures.';

ALTER TABLE forms.trailer_technical_form
    ADD COLUMN IF NOT EXISTS transport_interruption_autovs_51_3_1 BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN forms.trailer_technical_form.transport_interruption_autovs_51_3_1 IS
    'Autovedu on katkestatud autoveoseaduse § 51 lõike 3 punkti 1 alusel — sõltumatu lisameede, ei ole seotud result_type/result_transport_interruption-iga. Kuvatakse menetluse liigi sektsiooni juures.';
