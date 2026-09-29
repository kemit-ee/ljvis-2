-- liquibase formatted sql
-- changeset ljvis:20261126100000 ignore:true splitStatements:false
--
-- DRIVING_VIOLATION: Rooma I ja autojuhi lähetamise tase-3 kirjete ühtlustamine.
--
-- Osas keskkondades on nende all endiselt tehniline kood `ROOMA_I_01_MI` /
-- `LAHETAMINE_0X_MI` (20260901130000 / 20261122110000 / 20261123100000), teistes
-- ERRU koodid (20260912120000). Rooma I raskusaste on tegelikult VSI, mitte MI/MSI.
--
-- Lõppseis (sama muster mis ülejäänud puul): tase-3 `code` = ERRU rikkumise kood
-- (violationCode), `description` = raskusaste (severityCode), `name` = raskusaste
-- (lävivahemikku ei ole). Raskusaste tuletatakse ERRU koodi eesliitest.
--
-- Idempotentne. Puuduv tase-3 kirje lisatakse; olemasolev kirje uuendatakse.
-- Salvestatud vormide JSON-is asendatakse vanad koodid ja raskusaste.

CREATE OR REPLACE FUNCTION pg_temp.remap_violations(p_items JSONB, p_map JSONB)
    RETURNS JSONB
    LANGUAGE sql
    IMMUTABLE
AS $f$
    SELECT COALESCE(jsonb_agg(
        CASE
            WHEN p_map ? COALESCE(item->>'violationCode', item->>'level3Code') THEN
                item
                || CASE WHEN item ? 'violationCode'
                        THEN jsonb_build_object('violationCode', p_map->(item->>'violationCode')->>0) ELSE '{}'::JSONB END
                || CASE WHEN item ? 'level3Code'
                        THEN jsonb_build_object('level3Code', p_map->(item->>'level3Code')->>0) ELSE '{}'::JSONB END
                || CASE WHEN item ? 'level3Name'
                        THEN jsonb_build_object('level3Name', p_map->(COALESCE(item->>'violationCode', item->>'level3Code'))->>1) ELSE '{}'::JSONB END
                || CASE WHEN item ? 'severityCode'
                        THEN jsonb_build_object('severityCode',
                            p_map->(COALESCE(item->>'violationCode', item->>'level3Code'))->>1) ELSE '{}'::JSONB END
                || CASE WHEN item ? 'severity'
                        THEN jsonb_build_object('severity',
                            p_map->(COALESCE(item->>'violationCode', item->>'level3Code'))->>1) ELSE '{}'::JSONB END
            ELSE item
        END ORDER BY ord), '[]'::JSONB)
    FROM jsonb_array_elements(COALESCE(p_items, '[]'::JSONB)) WITH ORDINALITY AS a(item, ord);
$f$;

DO $$
    DECLARE
        v_clf_key BIGINT;
        v_parent  BIGINT;
        v_rec     RECORD;
        v_map     JSONB;
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
                ('ROOMA_I_01',    'VSI874'),
                ('LAHETAMINE_01', 'SI951'),
                ('LAHETAMINE_02', 'VSI875'),
                ('LAHETAMINE_03', 'VSI876'),
                ('LAHETAMINE_04', 'VSI877'),
                ('LAHETAMINE_05', 'VSI878'),
                ('LAHETAMINE_06', 'VSI879'),
                ('LAHETAMINE_07', 'SI952')
            ) AS t(parent_code, erru_code)
        LOOP
            SELECT classifier_value_key INTO v_parent
            FROM classifier.classifier_value
            WHERE classifier_key = v_clf_key AND code = v_rec.parent_code
            ORDER BY created_at DESC
            LIMIT 1;

            CONTINUE WHEN v_parent IS NULL;

            IF EXISTS (SELECT 1 FROM classifier.classifier_value WHERE parent_key = v_parent) THEN
                UPDATE classifier.classifier_value
                   SET code = v_rec.erru_code,
                       name = substring(v_rec.erru_code FROM '^[A-Z]+'),
                       description = substring(v_rec.erru_code FROM '^[A-Z]+')
                 WHERE parent_key = v_parent;
            ELSE
                INSERT INTO classifier.classifier_value
                    (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
                VALUES
                    (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.erru_code,
                     substring(v_rec.erru_code FROM '^[A-Z]+'), CURRENT_DATE, NULL, v_parent,
                     substring(v_rec.erru_code FROM '^[A-Z]+'), 'system');
            END IF;
        END LOOP;

        -- Salvestatud vormid: vana kood -> ERRU kood + raskusaste
        v_map := '{
            "ROOMA_I_01_MI":    ["VSI874", "VSI"],
            "LAHETAMINE_01_MI": ["SI951",  "SI"],
            "LAHETAMINE_02_MI": ["VSI875", "VSI"],
            "LAHETAMINE_03_MI": ["VSI876", "VSI"],
            "LAHETAMINE_04_MI": ["VSI877", "VSI"],
            "LAHETAMINE_05_MI": ["VSI878", "VSI"],
            "LAHETAMINE_06_MI": ["VSI879", "VSI"],
            "LAHETAMINE_07_MI": ["SI952",  "SI"]
        }'::JSONB;

        UPDATE forms.sp_driver_form
           SET violations_593_2008  = pg_temp.remap_violations(violations_593_2008, v_map),
               violations_2020_1057 = pg_temp.remap_violations(violations_2020_1057, v_map)
         WHERE violations_593_2008::TEXT LIKE '%\_MI%' OR violations_2020_1057::TEXT LIKE '%\_MI%';

        UPDATE forms.sp_teammate_form
           SET violations_593_2008  = pg_temp.remap_violations(violations_593_2008, v_map),
               violations_2020_1057 = pg_temp.remap_violations(violations_2020_1057, v_map)
         WHERE violations_593_2008::TEXT LIKE '%\_MI%' OR violations_2020_1057::TEXT LIKE '%\_MI%';
    END $$;
