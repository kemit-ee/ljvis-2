-- liquibase formatted sql
-- changeset ljvis:20261016100000 ignore:true splitStatements:false
--
-- DRIVING_VIOLATION: lisab puuduvad level-3 (raskusastme) read 16 rikkumisliigile,
-- millel 20260828277000 seemnes ei tekkinud ühtegi alamkirjet. Ilma level-3
-- kirjeta jääb sõidu- ja puhkeaja rikkumiste modaalis rea "Vali" rippmenüü
-- halliks (l3Options.length === 0) ega lase rikkumist üldse valida.
--
-- Raskusastmed (MSI/VSI/SI/MI) on määratud komisjoni määruse (EL) 2016/403
-- I lisa ja direktiivi 2006/22/EÜ III lisa alusel. PALUN VALIDEERI need
-- valdkonna eksperdi juures enne dev-i merge'imist — vt PR kirjeldus.
--
-- Idempotentne: parendile lisatakse read ainult siis, kui tal veel ühtegi
-- alamkirjet ei ole.

DO $$
    DECLARE
        v_created_by VARCHAR(100) := 'system';
        v_clf_key    BIGINT;
        v_parent_key BIGINT;
        v_rec        RECORD;
    BEGIN
        SELECT classifier_key INTO v_clf_key
        FROM classifier.classifier
        WHERE code = 'DRIVING_VIOLATION'
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_clf_key IS NULL THEN
            RAISE NOTICE 'DRIVING_VIOLATION classifier not found, skipping';
            RETURN;
        END IF;

        FOR v_rec IN
            SELECT * FROM (VALUES
                -- Määrus (EÜ) nr 561/2006
                ('MEESKOND_01',                  'MI',     'MI',  'MI'),   -- Art 5(1)  konduktori vanuse alampiir
                ('PUHKEPERIOODID_08',            'VSI843', 'VSI', 'VSI'),  -- Art 8(6b) puudub kompenseeriv puhkeperiood
                ('PUHKEPERIOODID_09',            'SI922',  'SI',  'SI'),   -- Art 8(8)  reg. iganädalane puhkus sõidukis
                ('PUHKEPERIOODID_10',            'SI923',  'SI',  'SI'),   -- Art 8(8)  majutuskulud katmata
                ('TOOKORRALDUS_01',              'SI924',  'SI',  'SI'),   -- Art 8(8a) juht ei saa naasta koju/keskusesse
                -- Määrus (EL) nr 165/2014
                ('SOIDUMEERIKU_PAIGALDAMINE_01', 'MSI604', 'MSI', 'MSI'),  -- Art 3/22  puudub tüübikinnitusega sõidumeerik
                ('SOIDUMEERIKUD_01',             'VSI844', 'VSI', 'VSI'),  -- Art 23(1) kontrollimata töökojas
                ('SOIDUMEERIKUD_08',             'MSI605', 'MSI', 'MSI'),  -- Art 32(3) pettust võimaldav seade
                ('ANDMETE_ESITAMINE_01',         'SI925',  'SI',  'SI'),   -- Art 34(5)(b)(v) "parvlaev/rong" märk
                ('ANDMETE_ESITAMINE_02',         'SI926',  'SI',  'SI'),   -- Art 34(6)  andmed salvestuslehele kandmata
                ('ANDMETE_ESITAMINE_03',         'MI',     'MI',  'MI'),   -- Art 34(7)  piiriületusriikide tähised
                ('ANDMETE_ESITAMINE_04',         'MI',     'MI',  'MI'),   -- Art 34(7)  tööpäeva algus/lõpp riigi tähised
                ('ANDMETE_ESITAMINE_05',         'VSI845', 'VSI', 'VSI'),  -- Art 36     keeldutakse kontrollist
                ('ANDMETE_ESITAMINE_06',         'VSI846', 'VSI', 'VSI'),  -- Art 36     ei esita 56 päeva kandeid/väljatrükke
                ('ANDMETE_ESITAMINE_07',         'VSI847', 'VSI', 'VSI'),  -- Art 36     juhikaarti ei esitata
                ('RIKKED_01',                    'SI927',  'SI',  'SI')    -- Art 37(1)  parandanud volitamata isik
            ) AS t(parent_code, code, name, severity)
        LOOP
            SELECT classifier_value_key INTO v_parent_key
            FROM classifier.classifier_value
            WHERE classifier_key = v_clf_key AND code = v_rec.parent_code
            ORDER BY created_at DESC
            LIMIT 1;

            IF v_parent_key IS NULL THEN
                RAISE NOTICE 'DRIVING_VIOLATION parent % not found, skipping', v_rec.parent_code;
                CONTINUE;
            END IF;

            IF EXISTS (
                SELECT 1 FROM classifier.classifier_value
                WHERE classifier_key = v_clf_key AND parent_key = v_parent_key
            ) THEN
                RAISE NOTICE 'DRIVING_VIOLATION parent % already has children, skipping', v_rec.parent_code;
                CONTINUE;
            END IF;

            INSERT INTO classifier.classifier_value
                (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
            VALUES
                (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name,
                 CURRENT_DATE, NULL, v_parent_key, v_rec.severity, v_created_by);
        END LOOP;
    END $$;
