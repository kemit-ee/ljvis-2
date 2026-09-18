-- liquibase formatted sql
-- changeset ljvis:20261122100000-rollback ignore:true splitStatements:false
DROP FUNCTION IF EXISTS forms.derive_sp_erru_points(JSONB, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB);

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
