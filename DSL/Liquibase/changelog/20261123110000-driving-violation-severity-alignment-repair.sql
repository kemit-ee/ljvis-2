-- liquibase formatted sql
-- changeset ljvis:20261123110000 ignore:true splitStatements:false
--
-- DRIVING_VIOLATION: 12 tase-3 kirjet jäid oma raskusastme (description)
-- osas 2016/403 I lisaga joondamata, kuigi 20260901100000 sektsioon B pidi
-- selle juba tegema. Põhjus: need read tekkisid alles HILJEM —
-- 20261016100000 (Oct 16) ja 20261122110000 (Nov 22) lisasid/nimetasid
-- need ümber pärast Sept 1 joondust, mistõttu tolleaegne UPDATE ei
-- leidnud veel ridu, mida joondada.
--
-- Kordab sama joondust täpselt samadele ridadele, aga viitab neile
-- PRAEGUSE koodi järgi (kolm rida on 20261122110000 poolt juba
-- <parent_code>_MI kujule ümber nimetatud, mistõttu 'MI' enam ei sobiks).
-- Idempotentne: description muudetakse ainult siis, kui see veel vale on.

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
            RAISE NOTICE 'DRIVING_VIOLATION classifier not found, skipping';
            RETURN;
        END IF;

        FOR v_rec IN
            SELECT * FROM (VALUES
                ('MEESKOND_01',          'MEESKOND_01_MI',          'SI'),
                ('ANDMETE_ESITAMINE_03', 'ANDMETE_ESITAMINE_03_MI', 'SI'),
                ('ANDMETE_ESITAMINE_04', 'ANDMETE_ESITAMINE_04_MI', 'SI'),
                ('PUHKEPERIOODID_08',    'VSI843',                  'MSI'),
                ('PUHKEPERIOODID_09',    'SI922',                   'MSI'),
                ('PUHKEPERIOODID_10',    'SI923',                   'MSI'),
                ('TOOKORRALDUS_01',      'SI924',                   'MSI'),
                ('SOIDUMEERIKUD_01',     'VSI844',                  'MSI'),
                ('ANDMETE_ESITAMINE_05', 'VSI845',                  'MSI'),
                ('ANDMETE_ESITAMINE_06', 'VSI846',                  'MSI'),
                ('ANDMETE_ESITAMINE_07', 'VSI847',                  'SI'),
                ('RIKKED_01',            'SI927',                   'MSI')
            ) AS t(parent_code, current_code, new_severity)
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

            UPDATE classifier.classifier_value
            SET description = v_rec.new_severity
            WHERE classifier_key = v_clf_key
              AND parent_key = v_parent_key
              AND code = v_rec.current_code
              AND description <> v_rec.new_severity;
        END LOOP;
    END $$;
