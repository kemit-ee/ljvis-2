-- liquibase formatted sql
-- changeset ljvis:20260901100000-rollback ignore:true splitStatements:false
--
-- Rollback 20260901100000: taastab tase-3 raskusastmed 20260828277000 /
-- 20261016100000 seemne väärtustele. Sektsiooniga A lisatud read jäetakse alles
-- (nende puudumine muudaks rikkumisliigi valitamatuks) — taastatakse ainult
-- nende raskusaste.

DO $$
    DECLARE
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
            RETURN;
        END IF;

        FOR v_rec IN
            SELECT * FROM (VALUES
                ('MEESKOND_01',          'MI',     'MI'),
                ('PUHKEPERIOODID_08',    'VSI843', 'VSI'),
                ('PUHKEPERIOODID_09',    'SI922',  'SI'),
                ('PUHKEPERIOODID_10',    'SI923',  'SI'),
                ('TOOKORRALDUS_01',      'SI924',  'SI'),
                ('TOOKORRALDUS_02',      'VSI815', 'VSI'),
                ('TOOKORRALDUS_03',      'VSI816', 'VSI'),
                ('SOIDUMEERIKUD_01',     'VSI844', 'VSI'),
                ('SOIDUMEERIKUD_02',     'VSI818', 'VSI'),
                ('SOIDUMEERIKUD_06',     'VSI819', 'VSI'),
                ('SOIDUMEERIKUD_07',     'VSI820', 'VSI'),
                ('SOIDUMEERIKUD_10',     'VSI821', 'VSI'),
                ('SOIDUMEERIKUD_11',     'VSI822', 'VSI'),
                ('SOIDUMEERIKUD_12',     'VSI823', 'VSI'),
                ('SOIDUMEERIKUD_13',     'VSI824', 'VSI'),
                ('SOIDUMEERIKUD_14',     'VSI825', 'VSI'),
                ('SOIDUMEERIKUD_15',     'VSI826', 'VSI'),
                ('SOIDUMEERIKUD_16',     'VSI827', 'VSI'),
                ('SOIDUMEERIKUD_17',     'SI916',  'SI'),
                ('SOIDUMEERIKUD_18',     'VSI828', 'VSI'),
                ('ANDMETE_ESITAMINE_03', 'MI',     'MI'),
                ('ANDMETE_ESITAMINE_04', 'MI',     'MI'),
                ('ANDMETE_ESITAMINE_05', 'VSI845', 'VSI'),
                ('ANDMETE_ESITAMINE_06', 'VSI846', 'VSI'),
                ('ANDMETE_ESITAMINE_07', 'VSI847', 'VSI'),
                ('RIKKED_01',            'SI927',  'SI'),
                ('RIKKED_02',            'VSI835', 'VSI'),
                ('MAKS_TOOAEG_02',       'SI918',  'SI'),
                ('MAKS_TOOAEG_02',       'VSI837', 'VSI'),
                ('SALVESTUSED_01',       'VSI841', 'VSI'),
                ('SALVESTUSED_02',       'VSI842', 'VSI'),
                ('ROOMA_I_01',           'MI',     'MI'),
                ('LAHETAMINE_01',        'MI',     'MI'),
                ('LAHETAMINE_02',        'MI',     'MI'),
                ('LAHETAMINE_03',        'MI',     'MI'),
                ('LAHETAMINE_04',        'MI',     'MI'),
                ('LAHETAMINE_05',        'MI',     'MI'),
                ('LAHETAMINE_06',        'MI',     'MI'),
                ('LAHETAMINE_07',        'MI',     'MI')
            ) AS t(parent_code, t3_code, old_severity)
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
            SET description = v_rec.old_severity
            WHERE classifier_key = v_clf_key
              AND code = v_rec.t3_code
              AND parent_key = v_parent_key
              AND description <> v_rec.old_severity;
        END LOOP;
    END $$;
