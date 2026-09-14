-- liquibase formatted sql
-- changeset ljvis:20260912120000 ignore:true splitStatements:false

-- Komisjoni määruse (EL) 2022/694 lisa jaotised 13 ja 14.
DO $$
DECLARE
    v_classifier_key BIGINT;
    v_parent_key BIGINT;
    v_row RECORD;
BEGIN
    SELECT classifier_key INTO v_classifier_key
      FROM classifier.classifier
     WHERE code = 'DRIVING_VIOLATION'
     ORDER BY created_at DESC LIMIT 1;

    UPDATE classifier.classifier_value
       SET name = 'Rooma I lepingu rikkumised'
     WHERE classifier_key = v_classifier_key AND code = 'ROOMA_I';
    UPDATE classifier.classifier_value
       SET name = 'Direktiivist (EL) 2020/1057 tulenevate autojuhi lähetamise nõuete rikkumiste kategooriad'
     WHERE classifier_key = v_classifier_key AND code = 'LAHETAMINE';

    FOR v_row IN SELECT * FROM (VALUES
        ('ROOMA_I_01',    'VSI874', 'VSI'),
        ('LAHETAMINE_01', 'SI951',  'SI'),
        ('LAHETAMINE_02', 'VSI875', 'VSI'),
        ('LAHETAMINE_03', 'VSI876', 'VSI'),
        ('LAHETAMINE_04', 'VSI877', 'VSI'),
        ('LAHETAMINE_05', 'VSI878', 'VSI'),
        ('LAHETAMINE_06', 'VSI879', 'VSI'),
        ('LAHETAMINE_07', 'SI952',  'SI')
    ) AS t(parent_code, erru_code, severity)
    LOOP
        SELECT classifier_value_key INTO v_parent_key
          FROM classifier.classifier_value
         WHERE classifier_key = v_classifier_key AND code = v_row.parent_code
         ORDER BY created_at DESC LIMIT 1;

        UPDATE classifier.classifier_value
           SET code = v_row.erru_code,
               name = v_row.severity,
               description = v_row.severity
         WHERE classifier_key = v_classifier_key
           AND parent_key = v_parent_key;
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION forms.derive_sp_erru_points(
    violations_561_2006 JSONB,
    violations_165_2014 JSONB,
    violations_2002_15 JSONB,
    violations_593_2008 JSONB,
    violations_2020_1057 JSONB,
    existing_points JSONB DEFAULT '[]'::JSONB
) RETURNS JSONB
LANGUAGE sql
IMMUTABLE
AS $$
    WITH violations AS (
        SELECT value AS item FROM jsonb_array_elements(COALESCE(violations_561_2006, '[]'::JSONB))
        UNION ALL SELECT value FROM jsonb_array_elements(COALESCE(violations_165_2014, '[]'::JSONB))
        UNION ALL SELECT value FROM jsonb_array_elements(COALESCE(violations_2002_15, '[]'::JSONB))
        UNION ALL SELECT value FROM jsonb_array_elements(COALESCE(violations_593_2008, '[]'::JSONB))
        UNION ALL SELECT value FROM jsonb_array_elements(COALESCE(violations_2020_1057, '[]'::JSONB))
    ), normalized AS (
        SELECT DISTINCT
            COALESCE(item->>'violationCode', item->>'level3Code') AS erru_code,
            UPPER(COALESCE(item->>'severityCode', item->>'severity')) AS severity_category
          FROM violations
         WHERE UPPER(COALESCE(item->>'severityCode', item->>'severity', '')) IN ('MSI', 'VSI', 'SI')
           AND COALESCE(item->>'violationCode', item->>'level3Code', '') <> ''
    ), points AS (
        SELECT jsonb_build_object(
            'erru_code', erru_code,
            'severity_category', severity_category,
            'source_type', 'auto_from_violation'
        ) AS point
          FROM normalized
        UNION
        SELECT value
          FROM jsonb_array_elements(COALESCE(existing_points, '[]'::JSONB))
         WHERE value->>'source_type' = 'manual'
    )
    SELECT COALESCE(jsonb_agg(point ORDER BY point->>'erru_code'), '[]'::JSONB)
      FROM points;
$$;
