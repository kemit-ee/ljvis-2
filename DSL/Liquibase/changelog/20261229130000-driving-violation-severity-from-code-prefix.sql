-- liquibase formatted sql
-- changeset ljvis:20261229130000 ignore:true splitStatements:false
--
-- DRIVING_VIOLATION: raskusaste = koodi eesliide. ERRU kood VSIxxx on alati VSI,
-- SIxxx on SI ja MSIxxx on MSI (EU_INFRINGEMENT klassifikaator vastab sellele
-- igal koodil). 2016/403 I lisaga joondamine muutis ainult raskusastet, mitte
-- koodi, mistõttu 28 tase-3 rea raskusaste erines koodist (nt VSI843 / MSI).
--
-- 1) Klassifikaator: `description` = koodi eesliide; `name` samuti, kui see on
--    raskusastme silt (lävega ridade tekst jääb).
-- 2) Salvestatud vormid: severityCode / severity (ja raskusastme sildiga
--    level3Name) viiakse koodi eesliitega kooskõlla, et riskiskoor (loeb
--    raskusastet salvestatud JSON-ist) ja ERRU punktid ei läheks lahku.
--    erru_points tuleneb koodi eesliitest (20261229120000) ja ei muutu.
-- Aegunud read parandatakse samuti. Idempotentne.

DO $$
DECLARE
    v_clf_key INT;
    v_tbl     TEXT;
    v_cols    TEXT[];
    v_col     TEXT;
BEGIN
    SELECT classifier_key INTO v_clf_key
      FROM classifier.classifier
     WHERE code = 'DRIVING_VIOLATION'
     ORDER BY created_at DESC, id DESC
     LIMIT 1;

    IF v_clf_key IS NULL THEN
        RETURN;
    END IF;

    UPDATE classifier.classifier_value cv
       SET description = substring(cv.code FROM '^(MSI|VSI|SI)'),
           name = CASE WHEN cv.name IN ('MI', 'SI', 'VSI', 'MSI')
                       THEN substring(cv.code FROM '^(MSI|VSI|SI)') ELSE cv.name END
     WHERE cv.classifier_key = v_clf_key
       AND cv.parent_key IS NOT NULL
       AND cv.code ~ '^(MSI|VSI|SI)[0-9]+$'
       AND (cv.description IS DISTINCT FROM substring(cv.code FROM '^(MSI|VSI|SI)')
            OR (cv.name IN ('MI', 'SI', 'VSI', 'MSI')
                AND cv.name <> substring(cv.code FROM '^(MSI|VSI|SI)')));

    -- ETag (get_classifiers_version.sql) loeb ridu ja MAX(id)-d: UPDATE seda ei
    -- muuda, seega lisa uus snapshot-rida, et brauserid klassifikaatorid uuesti laeksid.
    INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
    SELECT classifier_key, code, name, description, 'system'
      FROM classifier.classifier
     WHERE classifier_key = v_clf_key
     ORDER BY created_at DESC, id DESC
     LIMIT 1;

    CREATE OR REPLACE FUNCTION pg_temp.fix_severity(p_items JSONB)
        RETURNS JSONB
        LANGUAGE sql
        IMMUTABLE
    AS $f$
        SELECT COALESCE(jsonb_agg(
            CASE
                WHEN COALESCE(item->>'violationCode', item->>'level3Code') ~ '^(MSI|VSI|SI)[0-9]+$' THEN
                    item
                    || CASE WHEN item ? 'severityCode'
                            THEN jsonb_build_object('severityCode', substring(COALESCE(item->>'violationCode', item->>'level3Code') FROM '^(MSI|VSI|SI)')) ELSE '{}'::JSONB END
                    || CASE WHEN item ? 'severity'
                            THEN jsonb_build_object('severity', substring(COALESCE(item->>'violationCode', item->>'level3Code') FROM '^(MSI|VSI|SI)')) ELSE '{}'::JSONB END
                    || CASE WHEN item->>'level3Name' IN ('MI', 'SI', 'VSI', 'MSI')
                            THEN jsonb_build_object('level3Name', substring(COALESCE(item->>'violationCode', item->>'level3Code') FROM '^(MSI|VSI|SI)')) ELSE '{}'::JSONB END
                ELSE item
            END ORDER BY ord), '[]'::JSONB)
          FROM jsonb_array_elements(COALESCE(p_items, '[]'::JSONB)) WITH ORDINALITY AS t(item, ord)
         WHERE jsonb_typeof(p_items) = 'array';
    $f$;

    FOREACH v_tbl IN ARRAY ARRAY['sp_driver_form', 'sp_teammate_form', 'tram_control_card']
    LOOP
        v_cols := ARRAY['violations_561_2006', 'violations_165_2014', 'violations_2002_15',
                        'violations_593_2008', 'violations_2020_1057', 'cabotage_violations'];
        IF v_tbl <> 'tram_control_card' THEN
            v_cols := array_append(v_cols, 'mass_dimension_measurements');
        END IF;
        FOREACH v_col IN ARRAY v_cols
        LOOP
            EXECUTE format(
                'UPDATE forms.%1$I SET %2$I = pg_temp.fix_severity(%2$I)
                  WHERE %2$I IS NOT NULL AND jsonb_typeof(%2$I) = ''array''
                    AND %2$I IS DISTINCT FROM pg_temp.fix_severity(%2$I)',
                v_tbl, v_col);
        END LOOP;
    END LOOP;
END $$;
