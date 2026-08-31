-- liquibase formatted sql
-- changeset ljvis:20261020100000 splitStatements:false
--
-- PPA_STRUCTURE_UNIT_ADDRESS — prefektuuride päise-andmed autoveo katkestamise
-- kontrollvormi "Päis" ploki eeltäitmiseks (LJVIS2-74 §4). Frontend teeb
-- getValue('PPA_STRUCTURE_UNIT_ADDRESS', authUser.structuralunit) — väärtuse
-- code peab ühtima STRUCTURE_UNIT klassifikaatori koodiga (PPA_POHJA / PPA_IDA /
-- PPA_LOUNA / PPA_LAANE), sest kasutaja structural_unit salvestatakse just seda
-- koodi (frontend useUserForm.ts structuralUnitOptions -> value: u.code).
--
-- Asendab test-seemne DSL/Liquibase/test/20260804130000-...-placeholder-seed.sql.
-- Aadress on kõigil prefektuuridel sama (PPA peadirektsioon, tooteomaniku otsus,
-- 2026-09) — prefektuuridel puudub avalik eraldi kontaktplokk; maakondlik
-- tööpiirkond on lisatud name-teksti.
-- Idempotentne: DO $$ IF EXISTS ... RETURN.

DO $$
DECLARE
    v_clf_key BIGINT;
    v_rec     RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'PPA_STRUCTURE_UNIT_ADDRESS') THEN
        RAISE NOTICE 'PPA_STRUCTURE_UNIT_ADDRESS already exists, skipping';
        RETURN;
    END IF;

    INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
    VALUES (
        nextval('classifier.seq_classifier_key'),
        'PPA_STRUCTURE_UNIT_ADDRESS',
        'PPA struktuuriüksuste päise andmed',
        'Struktuuriüksuse (prefektuuri) päise-tekst vormide "Päis" ploki eeltäitmiseks (LJVIS2-74). Väärtuse code ühtib STRUCTURE_UNIT klassifikaatori koodiga.',
        'system'
    )
    RETURNING classifier_key INTO v_clf_key;

    FOR v_rec IN
        SELECT * FROM (VALUES
            ('PPA_POHJA', 'Politsei- ja Piirivalveamet – Põhja prefektuur (Harju maakond), Pärnu mnt 139, 15060 Tallinn, tel 1247'),
            ('PPA_IDA',   'Politsei- ja Piirivalveamet – Ida prefektuur (Lääne-Viru ja Ida-Viru maakond), Pärnu mnt 139, 15060 Tallinn, tel 1247'),
            ('PPA_LOUNA', 'Politsei- ja Piirivalveamet – Lõuna prefektuur (Jõgeva, Põlva, Tartu, Valga, Viljandi ja Võru maakond), Pärnu mnt 139, 15060 Tallinn, tel 1247'),
            ('PPA_LAANE', 'Politsei- ja Piirivalveamet – Lääne prefektuur (Hiiu, Järva, Lääne, Pärnu, Rapla ja Saare maakond), Pärnu mnt 139, 15060 Tallinn, tel 1247')
        ) AS t(code, header_text)
    LOOP
        INSERT INTO classifier.classifier_value (
            classifier_value_key, classifier_key, code, name, valid_from, valid_until, created_by
        )
        VALUES (
            nextval('classifier.seq_classifier_value_key'),
            v_clf_key,
            v_rec.code,
            v_rec.header_text,
            CURRENT_DATE,
            NULL,
            'system'
        );
    END LOOP;
END $$;
