-- liquibase formatted sql
-- changeset ljvis:20260901110000 ignore:true splitStatements:false
--
-- EU_INFRINGEMENT: viib 52 rikkumise raskusaste (`description`) kooskõlla
-- komisjoni määruse (EL) 2016/403 I lisaga "Raskete rikkumiste liigitamine",
-- konsolideeritud eestikeelne redaktsioon 02016R0403-20220523 (sisaldab
-- määruse (EL) 2022/694 muudatusi).
--
-- Forward-only UPDATE (sama muster kui 20260831100000). Koode (nt VSI817) ei
-- muudeta, et juba salvestatud välisrikkumise ja tehnokontrolli vormide
-- `violations` väärtused ei orvuks. Idempotentne (`description <> <uus>`).
--
-- EU_INFRINGEMENT seemnendatakse changesetiga 20260828275000, mis jookseb enne
-- seda — järjekorrasõltuvust ei ole.
--
-- CARGO_/PASSENGER_CABOTAGE_VIOLATION (VSI869–873) on I lisa järgi VSI ja jäävad
-- muutmata.
--
-- Peamised muudatused I lisa jaotiste kaupa:
--   jaotis 2  (165/2014)  : sõidumeeriku read VSI/SI -> MSI (v.a rida 20–23,26,28)
--   jaotis 1  (561/2006)  : art 8 lg 6b/8/8a, art 10 -> MSI
--   jaotis 3  (2002/15)   : art 4 (>60h) ja art 9 -> MSI/VSI
--   jaotis 6  (92/6)      : kõik kiiruspiiriku read -> MSI
--   jaotis 7  (2003/59)   : mõlemad koolituse read -> MSI
--   jaotis 9  (2008/68)   : VSI852 -> MSI; VSI853–856, VSI859 -> SI
--   jaotis 10 (1072/2009) : VSI861 -> MSI; SI939 -> VSI
--   jaotis 11 (1073/2009) : VSI863, SI942 -> MSI; SI940, SI941 -> VSI
--   jaotis 12 (1/2005)    : VSI864 -> SI
--   jaotis 13 (593/2008)  : VSI874 -> MSI
--   jaotis 14 (2020/1057) : VSI876–878 -> MSI; VSI875, VSI879 -> SI

DO $$
    DECLARE
        v_clf_key BIGINT;
        v_rec     RECORD;
    BEGIN
        SELECT classifier_key INTO v_clf_key
        FROM classifier.classifier
        WHERE code = 'EU_INFRINGEMENT'
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_clf_key IS NULL THEN
            RAISE NOTICE 'EU_INFRINGEMENT classifier not found, skipping';
            RETURN;
        END IF;

        FOR v_rec IN
            SELECT * FROM (VALUES
                -- 165/2014 (I lisa jaotis 2)
                ('VSI817', 'MSI'), ('VSI818', 'MSI'), ('VSI819', 'MSI'), ('VSI820', 'MSI'),
                ('VSI821', 'MSI'), ('VSI822', 'MSI'), ('VSI823', 'MSI'), ('VSI824', 'MSI'),
                ('VSI825', 'MSI'), ('VSI826', 'MSI'), ('VSI827', 'MSI'), ('VSI828', 'MSI'),
                ('SI916',  'MSI'), ('VSI829', 'MSI'), ('VSI832', 'MSI'), ('VSI834', 'MSI'),
                ('VSI833', 'SI'),  ('VSI835', 'SI'),  ('VSI868', 'SI'),
                -- 561/2006 (I lisa jaotis 1)
                ('VSI865', 'MSI'), ('VSI866', 'MSI'), ('SI947',  'MSI'), ('VSI867', 'MSI'),
                ('VSI815', 'MSI'), ('VSI816', 'MSI'),
                -- 2002/15/EÜ (I lisa jaotis 3)
                ('SI918',  'VSI'), ('VSI837', 'MSI'), ('VSI841', 'MSI'), ('VSI842', 'MSI'),
                -- 92/6/EMÜ (I lisa jaotis 6)
                ('VSI847', 'MSI'), ('SI926',  'MSI'),
                -- 2003/59/EÜ (I lisa jaotis 7)
                ('VSI848', 'MSI'), ('SI927',  'MSI'),
                -- 2008/68/EÜ (I lisa jaotis 9)
                ('VSI852', 'MSI'), ('VSI853', 'SI'), ('VSI854', 'SI'), ('VSI855', 'SI'),
                ('VSI856', 'SI'),  ('VSI859', 'SI'),
                -- 1072/2009 (I lisa jaotis 10)
                ('VSI861', 'MSI'), ('SI939',  'VSI'),
                -- 1073/2009 (I lisa jaotis 11)
                ('VSI863', 'MSI'), ('SI940',  'VSI'), ('SI941',  'VSI'), ('SI942',  'MSI'),
                -- 1/2005 (I lisa jaotis 12)
                ('VSI864', 'SI'),
                -- 593/2008 (I lisa jaotis 13)
                ('VSI874', 'MSI'),
                -- 2020/1057 (I lisa jaotis 14)
                ('VSI875', 'SI'), ('VSI876', 'MSI'), ('VSI877', 'MSI'), ('VSI878', 'MSI'),
                ('VSI879', 'SI')
            ) AS t(code, new_severity)
        LOOP
            UPDATE classifier.classifier_value
            SET description = v_rec.new_severity
            WHERE classifier_key = v_clf_key
              AND code = v_rec.code
              AND description <> v_rec.new_severity;
        END LOOP;
    END $$;
