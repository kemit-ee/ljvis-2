-- liquibase formatted sql
-- changeset ljvis:20261123110000-rollback ignore:true splitStatements:false
--
-- Rollback 20261123110000: taastab raskusastme (description) 20261016100000 /
-- 20261122110000 seemne väärtustele.

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
                ('MEESKOND_01',          'MEESKOND_01_MI',          'MI'),
                ('ANDMETE_ESITAMINE_03', 'ANDMETE_ESITAMINE_03_MI', 'MI'),
                ('ANDMETE_ESITAMINE_04', 'ANDMETE_ESITAMINE_04_MI', 'MI'),
                ('PUHKEPERIOODID_08',    'VSI843',                  'VSI'),
                ('PUHKEPERIOODID_09',    'SI922',                   'SI'),
                ('PUHKEPERIOODID_10',    'SI923',                   'SI'),
                ('TOOKORRALDUS_01',      'SI924',                   'SI'),
                ('SOIDUMEERIKUD_01',     'VSI844',                  'VSI'),
                ('ANDMETE_ESITAMINE_05', 'VSI845',                  'VSI'),
                ('ANDMETE_ESITAMINE_06', 'VSI846',                  'VSI'),
                ('ANDMETE_ESITAMINE_07', 'VSI847',                  'VSI'),
                ('RIKKED_01',            'SI927',                   'SI')
            ) AS t(parent_code, current_code, old_severity)
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
              AND parent_key = v_parent_key
              AND code = v_rec.current_code;
        END LOOP;
    END $$;
