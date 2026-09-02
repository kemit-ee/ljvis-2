-- liquibase formatted sql
-- changeset ljvis:20260901100000 ignore:true splitStatements:false
--
-- DRIVING_VIOLATION: viib tase-3 (raskusastme) kirjete raskusastme (`description`)
-- kooskõlla komisjoni määruse (EL) 2016/403 I lisaga "Raskete rikkumiste
-- liigitamine", konsolideeritud eestikeelne redaktsioon 02016R0403-20220523
-- (sisaldab määruse (EL) 2022/694 muudatusi). Puudutab I lisa jaotisi
-- 1 (561/2006), 2 (165/2014), 3 (2002/15/EÜ), 13 (593/2008), 14 (2020/1057).
--
-- Rikkumisliike ega läviväärtusi ei muudeta — 20260828277000 + 20261016100000
-- seemnete struktuur on I lisa suhtes juba täielik.
--
-- Tase-3 `code` jääb muutmata (nt VSI818 jääb VSI818-ks ka siis, kui aste on nüüd
-- MSI), et juba salvestatud vormide `violation_code` väärtused ei orvuks.
--
-- See migratsioon on JÄRJEKORRAST SÕLTUMATU: sektsioon A tagab, et 20261016100000-s
-- lisatavad 16 tase-3 rida on olemas (õige raskusastmega), sektsioon B
-- normaliseerib kõik 39 rida. Nii annab tulemus sama olenemata sellest, kas see
-- migratsioon jookseb enne või pärast 20261016100000. Mõlemad sektsioonid on
-- idempotentsed.
--
-- Muudatuste loend (parent → tase-3 kood: vana → uus | 2016/403 I lisa viide):
--   561/2006  (jaotis 1)
--     MEESKOND_01         / MI     : MI  -> SI   | rida 1  art 5 lg 1
--     PUHKEPERIOODID_08   / VSI843 : VSI -> MSI  | rida 30 art 8 lg 6b
--     PUHKEPERIOODID_09   / SI922  : SI  -> MSI  | rida 31 art 8 lg 8
--     PUHKEPERIOODID_10   / SI923  : SI  -> MSI  | rida 32 art 8 lg 8
--     TOOKORRALDUS_01     / SI924  : SI  -> MSI  | rida 39 art 8 lg 8a
--     TOOKORRALDUS_02     / VSI815 : VSI -> MSI  | rida 40 art 10 lg 1
--     TOOKORRALDUS_03     / VSI816 : VSI -> MSI  | rida 41 art 10 lg 2
--   165/2014  (jaotis 2)
--     SOIDUMEERIKUD_01     / VSI844 : VSI -> MSI  | rida 2  art 23 lg 1
--     SOIDUMEERIKUD_02     / VSI818 : VSI -> MSI  | rida 3  art 27
--     SOIDUMEERIKUD_06     / VSI819 : VSI -> MSI  | rida 7  art 32 lg 1
--     SOIDUMEERIKUD_07     / VSI820 : VSI -> MSI  | rida 8  art 32 lg 1 / 33 lg 1
--     SOIDUMEERIKUD_10     / VSI821 : VSI -> MSI  | rida 11 art 33 lg 2
--     SOIDUMEERIKUD_11     / VSI822 : VSI -> MSI  | rida 12 art 33 lg 2
--     SOIDUMEERIKUD_12     / VSI823 : VSI -> MSI  | rida 13 art 34 lg 1
--     SOIDUMEERIKUD_13     / VSI824 : VSI -> MSI  | rida 14 art 34 lg 1
--     SOIDUMEERIKUD_14     / VSI825 : VSI -> MSI  | rida 15 art 34 lg 1a
--     SOIDUMEERIKUD_15     / VSI826 : VSI -> MSI  | rida 16 art 34 lg 2
--     SOIDUMEERIKUD_16     / VSI827 : VSI -> MSI  | rida 17 art 34 lg 3
--     SOIDUMEERIKUD_17     / SI916  : SI  -> MSI  | rida 18 art 34 lg 4
--     SOIDUMEERIKUD_18     / VSI828 : VSI -> MSI  | rida 19 art 34 lg 5
--     ANDMETE_ESITAMINE_03 / MI     : MI  -> SI   | rida 22 art 34 lg 7
--     ANDMETE_ESITAMINE_04 / MI     : MI  -> SI   | rida 23 art 34 lg 7
--     ANDMETE_ESITAMINE_05 / VSI845 : VSI -> MSI  | rida 24 art 36
--     ANDMETE_ESITAMINE_06 / VSI846 : VSI -> MSI  | rida 25 art 36
--     ANDMETE_ESITAMINE_07 / VSI847 : VSI -> SI   | rida 26 art 36
--     RIKKED_01            / SI927  : SI  -> MSI  | rida 27 art 37 lg 1 / 22 lg 1
--     RIKKED_02            / VSI835 : VSI -> SI   | rida 28 art 37 lg 2
--   2002/15/EÜ (jaotis 3)
--     MAKS_TOOAEG_02       / SI918  : SI  -> VSI  | rida 3  art 4
--     MAKS_TOOAEG_02       / VSI837 : VSI -> MSI  | rida 4  art 4
--     SALVESTUSED_01       / VSI841 : VSI -> MSI  | rida 11 art 9
--     SALVESTUSED_02       / VSI842 : VSI -> MSI  | rida 12 art 9
--   593/2008  (jaotis 13)
--     ROOMA_I_01          / MI     : MI  -> MSI  | rida 1  Rooma I määrus
--   2020/1057 (jaotis 14)
--     LAHETAMINE_01        / MI     : MI  -> SI   | rida 1  art 1 lg 11 p a
--     LAHETAMINE_02        / MI     : MI  -> SI   | rida 2  art 1 lg 11 p a
--     LAHETAMINE_03        / MI     : MI  -> MSI  | rida 3  art 1 lg 11 p b
--     LAHETAMINE_04        / MI     : MI  -> MSI  | rida 4  art 1 lg 11 p b
--     LAHETAMINE_05        / MI     : MI  -> MSI  | rida 5  art 1 lg 11 p b
--     LAHETAMINE_06        / MI     : MI  -> SI   | rida 6  art 1 lg 11 p c
--     LAHETAMINE_07        / MI     : MI  -> SI   | rida 7  art 1 lg 12

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

        -- ── Sektsioon A: taga 20261016100000 tase-3 ridade olemasolu ────────────
        -- Lisatakse ainult siis, kui rikkumisliigil (tase 2) pole ühtegi last.
        -- name = raskusaste (nagu 20261016100000-s), description = ÕIGE raskusaste.
        FOR v_rec IN
            SELECT * FROM (VALUES
                ('MEESKOND_01',                  'MI',     'SI'),
                ('PUHKEPERIOODID_08',            'VSI843', 'MSI'),
                ('PUHKEPERIOODID_09',            'SI922',  'MSI'),
                ('PUHKEPERIOODID_10',            'SI923',  'MSI'),
                ('TOOKORRALDUS_01',              'SI924',  'MSI'),
                ('SOIDUMEERIKU_PAIGALDAMINE_01', 'MSI604', 'MSI'),
                ('SOIDUMEERIKUD_01',             'VSI844', 'MSI'),
                ('SOIDUMEERIKUD_08',             'MSI605', 'MSI'),
                ('ANDMETE_ESITAMINE_01',         'SI925',  'SI'),
                ('ANDMETE_ESITAMINE_02',         'SI926',  'SI'),
                ('ANDMETE_ESITAMINE_03',         'MI',     'SI'),
                ('ANDMETE_ESITAMINE_04',         'MI',     'SI'),
                ('ANDMETE_ESITAMINE_05',         'VSI845', 'MSI'),
                ('ANDMETE_ESITAMINE_06',         'VSI846', 'MSI'),
                ('ANDMETE_ESITAMINE_07',         'VSI847', 'SI'),
                ('RIKKED_01',                    'SI927',  'MSI')
            ) AS t(parent_code, t3_code, severity)
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
                CONTINUE;
            END IF;

            INSERT INTO classifier.classifier_value
                (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
            VALUES
                (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.t3_code, v_rec.severity,
                 CURRENT_DATE, NULL, v_parent_key, v_rec.severity, v_created_by);
        END LOOP;

        -- ── Sektsioon B: normaliseeri raskusaste 2016/403 I lisa järgi ─────────
        FOR v_rec IN
            SELECT * FROM (VALUES
                ('MEESKOND_01',          'MI',     'SI'),
                ('PUHKEPERIOODID_08',    'VSI843', 'MSI'),
                ('PUHKEPERIOODID_09',    'SI922',  'MSI'),
                ('PUHKEPERIOODID_10',    'SI923',  'MSI'),
                ('TOOKORRALDUS_01',      'SI924',  'MSI'),
                ('TOOKORRALDUS_02',      'VSI815', 'MSI'),
                ('TOOKORRALDUS_03',      'VSI816', 'MSI'),
                ('SOIDUMEERIKUD_01',     'VSI844', 'MSI'),
                ('SOIDUMEERIKUD_02',     'VSI818', 'MSI'),
                ('SOIDUMEERIKUD_06',     'VSI819', 'MSI'),
                ('SOIDUMEERIKUD_07',     'VSI820', 'MSI'),
                ('SOIDUMEERIKUD_10',     'VSI821', 'MSI'),
                ('SOIDUMEERIKUD_11',     'VSI822', 'MSI'),
                ('SOIDUMEERIKUD_12',     'VSI823', 'MSI'),
                ('SOIDUMEERIKUD_13',     'VSI824', 'MSI'),
                ('SOIDUMEERIKUD_14',     'VSI825', 'MSI'),
                ('SOIDUMEERIKUD_15',     'VSI826', 'MSI'),
                ('SOIDUMEERIKUD_16',     'VSI827', 'MSI'),
                ('SOIDUMEERIKUD_17',     'SI916',  'MSI'),
                ('SOIDUMEERIKUD_18',     'VSI828', 'MSI'),
                ('ANDMETE_ESITAMINE_03', 'MI',     'SI'),
                ('ANDMETE_ESITAMINE_04', 'MI',     'SI'),
                ('ANDMETE_ESITAMINE_05', 'VSI845', 'MSI'),
                ('ANDMETE_ESITAMINE_06', 'VSI846', 'MSI'),
                ('ANDMETE_ESITAMINE_07', 'VSI847', 'SI'),
                ('RIKKED_01',            'SI927',  'MSI'),
                ('RIKKED_02',            'VSI835', 'SI'),
                ('MAKS_TOOAEG_02',       'SI918',  'VSI'),
                ('MAKS_TOOAEG_02',       'VSI837', 'MSI'),
                ('SALVESTUSED_01',       'VSI841', 'MSI'),
                ('SALVESTUSED_02',       'VSI842', 'MSI'),
                ('ROOMA_I_01',           'MI',     'MSI'),
                ('LAHETAMINE_01',        'MI',     'SI'),
                ('LAHETAMINE_02',        'MI',     'SI'),
                ('LAHETAMINE_03',        'MI',     'MSI'),
                ('LAHETAMINE_04',        'MI',     'MSI'),
                ('LAHETAMINE_05',        'MI',     'MSI'),
                ('LAHETAMINE_06',        'MI',     'SI'),
                ('LAHETAMINE_07',        'MI',     'SI')
            ) AS t(parent_code, t3_code, new_severity)
        LOOP
            SELECT classifier_value_key INTO v_parent_key
            FROM classifier.classifier_value
            WHERE classifier_key = v_clf_key AND code = v_rec.parent_code
            ORDER BY created_at DESC
            LIMIT 1;

            IF v_parent_key IS NULL THEN
                CONTINUE;
            END IF;

            UPDATE classifier.classifier_value
            SET description = v_rec.new_severity
            WHERE classifier_key = v_clf_key
              AND code = v_rec.t3_code
              AND parent_key = v_parent_key
              AND description <> v_rec.new_severity;
        END LOOP;
    END $$;
