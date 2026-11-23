-- liquibase formatted sql
-- changeset ljvis:20261229110000 ignore:true splitStatements:false
--
-- DRIVING_VIOLATION: SP-kontrollkaardi raskete rikkumiste koodide parandus
-- vastavalt dokumendile "Vead SP-kontrollkaardi rikkumiste koodides".
--
-- Probleem: tase-3 koodid olid kolme sorti valed:
--   A) laenatud massi/pikkuse/laiuse koodid (SI922-927, VSI843-847, MSI604/605),
--      mis kattuvad EU_INFRINGEMENT-i massi/mõõtmete koodidega;
--   B) kohatäitja 'MI' (<parent>_MI), millel ERRU koodi ei ole;
--   C) read, mida vanas süsteemis ei ole (HALL).
--
-- Lõppseis (sama muster mis 20261126100000): tase-3 `code` = ERRU rikkumise kood,
-- `description` = `name` = raskusaste, mis tuletatakse koodi eesliitest.
-- Koodid on needsamad, mis EU_INFRINGEMENT klassifikaatoris (tekst vastab).
--
-- Aegunud read (C) lõpetatakse (valid_until), mitte ei kustutata: salvestatud
-- vormid säilitavad oma andmed, vormi valik filtreerib `isValid !== false`.
-- Salvestatud vormid (sp_driver_form, sp_teammate_form, tram_control_card):
-- vana kood -> uus kood + raskusaste, väljade kaupa (kood on ainult välja piires
-- üheselt tõlgendatav). Aegunud ridade salvestatud koode ei muudeta.
-- Idempotentne.

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
                        THEN jsonb_build_object('severityCode', p_map->(COALESCE(item->>'violationCode', item->>'level3Code'))->>1) ELSE '{}'::JSONB END
                || CASE WHEN item ? 'severity'
                        THEN jsonb_build_object('severity', p_map->(COALESCE(item->>'violationCode', item->>'level3Code'))->>1) ELSE '{}'::JSONB END
            ELSE item
        END ORDER BY ord), '[]'::JSONB)
    FROM jsonb_array_elements(COALESCE(p_items, '[]'::JSONB)) WITH ORDINALITY AS a(item, ord);
$f$;

DO $$
    DECLARE
        v_clf_key BIGINT;
        v_parent  BIGINT;
        v_rec     RECORD;
        v_map561  JSONB;
        v_map165  JSONB;
        v_tbl     TEXT;
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

        -- A + B: tase-3 kood = ERRU kood, nimi = kirjeldus = raskusaste
        FOR v_rec IN
            SELECT * FROM (VALUES
                ('PUHKEPERIOODID_08',            'VSI865'),  -- art 8 lg 6b
                ('PUHKEPERIOODID_09',            'VSI866'),  -- art 8 lg 8 esimene
                ('MEESKOND_01',                  'SI900'),   -- art 5 lg 1
                ('SOIDUMEERIKU_PAIGALDAMINE_01', 'MSI201'),  -- art 3 lg 1, 4, 4a
                ('SOIDUMEERIKUD_01',             'VSI817'),  -- art 23 lg 1
                ('SOIDUMEERIKUD_08',             'MSI202'),  -- art 32 lg 3 esimene
                ('ANDMETE_ESITAMINE_01',         'SI948'),   -- art 34 lg 5 p b alap v
                ('ANDMETE_ESITAMINE_02',         'VSI868'),  -- art 34 lg 6
                ('ANDMETE_ESITAMINE_03',         'SI949'),   -- art 34 lg 7 esimene
                ('ANDMETE_ESITAMINE_04',         'SI950'),   -- art 34 lg 7 teine
                ('ANDMETE_ESITAMINE_05',         'VSI829'),  -- art 36 esimene
                ('ANDMETE_ESITAMINE_06',         'VSI832'),  -- art 36 teine
                ('ANDMETE_ESITAMINE_07',         'VSI833'),  -- art 36 kolmas
                ('RIKKED_01',                    'VSI834'),  -- art 37 lg 1
                ('ROOMA_I_01',                   'VSI874')   -- Rooma I
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
                 WHERE parent_key = v_parent
                   AND (code <> v_rec.erru_code
                        OR name <> substring(v_rec.erru_code FROM '^[A-Z]+')
                        OR description IS DISTINCT FROM substring(v_rec.erru_code FROM '^[A-Z]+'));
            ELSE
                INSERT INTO classifier.classifier_value
                    (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
                VALUES
                    (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.erru_code,
                     substring(v_rec.erru_code FROM '^[A-Z]+'), CURRENT_DATE, NULL, v_parent,
                     substring(v_rec.erru_code FROM '^[A-Z]+'), 'system');
            END IF;
        END LOOP;

        -- C: vanas süsteemis HALL read lõpetatakse (tase 3, tase 2, tase 1)
        UPDATE classifier.classifier_value c3
           SET valid_until = CURRENT_DATE
          FROM classifier.classifier_value c2
         WHERE c3.parent_key = c2.classifier_value_key
           AND c2.classifier_key = v_clf_key
           AND c2.code IN ('PUHKEPERIOODID_10',
                           'TOOKORRALDUS_01', 'TOOKORRALDUS_02', 'TOOKORRALDUS_03',
                           'SOIDUMEERIKUD_10', 'SOIDUMEERIKUD_11',
                           'SALVESTUSED_01', 'SALVESTUSED_02')
           AND (c3.valid_until IS NULL OR c3.valid_until > CURRENT_DATE);

        UPDATE classifier.classifier_value
           SET valid_until = CURRENT_DATE
         WHERE classifier_key = v_clf_key
           AND code IN ('PUHKEPERIOODID_10',
                        'TOOKORRALDUS', 'TOOKORRALDUS_01', 'TOOKORRALDUS_02', 'TOOKORRALDUS_03',
                        'SOIDUMEERIKUD_10', 'SOIDUMEERIKUD_11',
                        'SALVESTUSED', 'SALVESTUSED_01', 'SALVESTUSED_02')
           AND (valid_until IS NULL OR valid_until > CURRENT_DATE);

        -- Salvestatud vormid: vana kood -> uus kood + raskusaste, väljade kaupa
        v_map561 := '{
            "VSI843":          ["VSI865", "VSI"],
            "SI922":           ["VSI866", "VSI"],
            "MEESKOND_01_MI":  ["SI900",  "SI"]
        }'::JSONB;
        v_map165 := '{
            "MSI604":                     ["MSI201", "MSI"],
            "VSI844":                     ["VSI817", "VSI"],
            "MSI605":                     ["MSI202", "MSI"],
            "SI925":                      ["SI948",  "SI"],
            "SI926":                      ["VSI868", "VSI"],
            "ANDMETE_ESITAMINE_03_MI":    ["SI949",  "SI"],
            "ANDMETE_ESITAMINE_04_MI":    ["SI950",  "SI"],
            "VSI845":                     ["VSI829", "VSI"],
            "VSI846":                     ["VSI832", "VSI"],
            "VSI847":                     ["VSI833", "VSI"],
            "SI927":                      ["VSI834", "VSI"]
        }'::JSONB;

        FOREACH v_tbl IN ARRAY ARRAY['sp_driver_form', 'sp_teammate_form', 'tram_control_card']
        LOOP
            EXECUTE format(
                'UPDATE forms.%I
                    SET violations_561_2006 = pg_temp.remap_violations(violations_561_2006, %L::JSONB),
                        violations_165_2014 = pg_temp.remap_violations(violations_165_2014, %L::JSONB)
                  WHERE violations_561_2006 IS DISTINCT FROM pg_temp.remap_violations(violations_561_2006, %L::JSONB)
                     OR violations_165_2014 IS DISTINCT FROM pg_temp.remap_violations(violations_165_2014, %L::JSONB)',
                v_tbl, v_map561, v_map165, v_map561, v_map165);
        END LOOP;
    END $$;
