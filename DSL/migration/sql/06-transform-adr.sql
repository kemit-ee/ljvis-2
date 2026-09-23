-- DangerousDelivery2012 -> compound_form + adr_form
-- Coordinated by migrate.py in one transaction. Incomplete business mappings
-- are permitted only on a disposable rehearsal target (see README.md).
-- Confirmed trailer/teammate discriminators BLOCK loading until routing is implemented.
-- Source EAV values, group membership and metadata remain in source_snapshot.

CREATE TEMP TABLE tmp_adr_src ON COMMIT DROP AS
WITH candidate AS (
    SELECT cf.id, cf.control_stage, cf.created_date, cf.controlled_date, cf.created_by_user_id, cf.united_form_part
    FROM staging.raw_control_form cf
    WHERE cf.form_type_name = 'DangerousDelivery2012'
      AND cf.control_stage IN ('Confirmed', 'Published')
      AND cf.created_date >= :'cutoff_from'::timestamp
      AND NOT EXISTS (
          SELECT 1 FROM migration.form_link fl
          WHERE fl.legacy_source = 'ControlForm' AND fl.legacy_id = cf.id::text
            AND fl.target_table = 'forms.adr_form'
      )
)
SELECT
    c.id AS legacy_id, c.control_stage, c.united_form_part,
    (c.created_date AT TIME ZONE 'Europe/Tallinn') AS created_at,
    c.controlled_date AS controlled_at,
    c.created_by_user_id,
    array_agg(DISTINCT nullif(btrim(v.value), '')) FILTER (WHERE v.classifier_name = 'otsus' AND nullif(btrim(v.value), '') IS NOT NULL) AS outcomes,
    max(v.value) FILTER (WHERE v.classifier_name = 'InspectionAddress.Country') AS control_country_code,
    max(v.value) FILTER (WHERE v.classifier_name = 'InspectionAddress.Region')  AS county,
    max(v.value) FILTER (WHERE v.classifier_name = 'InspectionAddress.City')    AS city,
    max(v.value) FILTER (WHERE v.classifier_name = 'InspectionAddress.Line1')   AS address,
    max(coalesce(v.date_value, migration.safe_timestamp(v.value))) FILTER (WHERE v.classifier_name = 'InspectionDate.Date')  AS control_date,
    max(v.value) FILTER (WHERE v.classifier_name = 'InspectionDate.Time')       AS control_time_raw,
    max(v.value) FILTER (WHERE v.classifier_name = 'Inspector.FirstName')       AS inspector_first_name,
    max(v.value) FILTER (WHERE v.classifier_name = 'Inspector.LastName')        AS inspector_last_name,
    max(v.value) FILTER (WHERE v.classifier_name = 'Inspector.AmetiisikuAndmed') AS inspector_unit,
    max(v.value) FILTER (WHERE v.classifier_name = 'Inspector.Job')             AS inspector_profession
    -- Outcomes are read from EAV otsus; dbo.ControlDecision is not joined.
FROM candidate c
LEFT JOIN staging.raw_control_form_value v ON v.control_form_id = c.id
GROUP BY c.id, c.control_stage, c.united_form_part, c.created_date, c.controlled_date, c.created_by_user_id;

CREATE TEMP TABLE tmp_adr_final ON COMMIT DROP AS
SELECT
    s.*,
    nextval('forms.seq_compound_form_key') AS compound_key,
    nextval('forms.seq_adr_form_key') AS adr_key,
    CASE s.control_stage WHEN 'Published' THEN 'published' ELSE 'confirmed' END AS status,
    coalesce(
        nullif(btrim(u.personal_code), ''),
        nullif(btrim(concat_ws(' ', u.first_name, u.last_name)), ''),
        nullif(btrim(ver.user_name), ''),
        '-'
    ) AS created_by,
    (u.personal_code IS NULL OR btrim(u.personal_code) = '') AS author_fallback_used,
    coalesce(nullif(btrim(s.inspector_first_name), ''), '-') AS inspector_first_name_out,
    coalesce(nullif(btrim(s.inspector_last_name),  ''), '-') AS inspector_last_name_out,
    coalesce(nullif(btrim(s.inspector_unit),       ''), '-') AS inspector_unit_out,
    coalesce(nullif(btrim(s.inspector_profession), ''), '-') AS inspector_profession_out,
    migration.safe_country_code(s.control_country_code)      AS control_country_code_out,
    coalesce(s.control_date::date, s.controlled_at::date, s.created_at::date)       AS control_date_out,
    -- control_time_raw is free text in the source; guard the cast instead of
    -- crashing the whole batch on one garbage value (see README.md).
    coalesce(migration.safe_time(s.control_time_raw), '00:00')  AS control_time_out,
    -- A single confirmed EAV outcome is mapped; all others require review.
    coalesce(migration.legacy_result('adr', s.outcomes), 'ok') AS result_type_out
FROM tmp_adr_src s
LEFT JOIN staging.raw_user u ON u.id = s.created_by_user_id
LEFT JOIN LATERAL (
    SELECT rv.user_name FROM staging.raw_versions rv
    WHERE rv.table_name = 'ControlForm' AND rv.row_id = s.legacy_id
    AND nullif(btrim(rv.user_name), '') IS NOT NULL
    ORDER BY rv.updated_time ASC NULLS LAST, rv.id ASC LIMIT 1
) ver ON true;

CREATE TEMP TABLE tmp_adr_numbered ON COMMIT DROP AS
SELECT m.*,
       'koond-' || extract(year FROM m.created_at)::int || '-' || migration.number_suffix(m.compound_key) AS compound_form_number,
       'ov-'    || extract(year FROM m.created_at)::int || '-' || migration.number_suffix(m.adr_key)       AS adr_form_number
FROM tmp_adr_final m;

INSERT INTO migration.quality_report
    (migration_run_id, legacy_source, legacy_id, target_table, column_name, issue, applied_default, raw_value)
SELECT :'run_id', 'ControlForm', f.legacy_id::text, 'forms.compound_form', c.col, c.issue, c.applied, c.raw
FROM tmp_adr_numbered f
CROSS JOIN LATERAL (VALUES
    ('inspector_first_name', 'missing_required', '-',  f.inspector_first_name),
    ('inspector_last_name',  'missing_required', '-',  f.inspector_last_name),
    ('inspector_unit',       'missing_required', '-',  f.inspector_unit),
    ('inspector_profession', 'missing_required', '-',  f.inspector_profession),
    ('control_country_code', 'missing_required', '-', f.control_country_code)
) AS c(col, issue, applied, raw)
WHERE coalesce(btrim(c.raw), '') = '';

INSERT INTO migration.quality_report
    (migration_run_id, legacy_source, legacy_id, target_table, column_name, issue, applied_default, raw_value)
SELECT :'run_id', 'ControlForm', f.legacy_id::text, 'forms.adr_form', col,
       'unmapped_classifier', col_default,
       'DangerousDelivery -> adr_form needs a domain-expert field review, see README.md'
FROM tmp_adr_numbered f
CROSS JOIN LATERAL (VALUES
    ('dangerous_goods', '[]'), ('infringements', '[]'),
    ('last_load_address', 'NULL'), ('next_load_address', 'NULL')
) AS v(col, col_default);

INSERT INTO migration.quality_report
    (migration_run_id, legacy_source, legacy_id, target_table, column_name, issue, applied_default, raw_value)
SELECT :'run_id', 'ControlForm', f.legacy_id::text, 'forms.adr_form',
       'created_by', 'author_fallback', f.created_by, f.created_by_user_id::text
FROM tmp_adr_numbered f WHERE f.author_fallback_used;

INSERT INTO migration.quality_report
    (migration_run_id, legacy_source, legacy_id, target_table, column_name, issue, applied_default, raw_value)
SELECT :'run_id', 'ControlForm', f.legacy_id::text, 'forms.adr_form',
       'result_type', 'unmapped_result', 'ok', array_to_string(f.outcomes, ',')
FROM tmp_adr_numbered f
WHERE migration.legacy_result('adr', f.outcomes) IS NULL;

-- See 04-transform-compound-and-technical.sql for the full explanation.
INSERT INTO migration.quality_report
    (migration_run_id, legacy_source, legacy_id, target_table, column_name, issue, applied_default, raw_value)
SELECT :'run_id', 'ControlForm', f.legacy_id::text, 'forms.compound_form',
       'compound_form_key', 'compound_grouping_skipped', 'synthetic_standalone_case', 'united_form_part=true'
FROM tmp_adr_numbered f
WHERE f.united_form_part;

WITH ins_compound AS (
    INSERT INTO forms.compound_form (
        compound_form_key, form_number, control_year, template_version, status,
        control_date, control_time, control_country_code, county, city, address,
        inspector_first_name, inspector_last_name, inspector_organisation_id,
        inspector_unit, inspector_profession,
        extra_data, created_at, created_by
    )
    SELECT
        f.compound_key,
        migration.target_text(f.compound_form_number, 'forms.compound_form', 'form_number', 'ControlForm:' || f.legacy_id::text),
        extract(year FROM f.created_at)::int,
        0,
        migration.target_text(f.status, 'forms.compound_form', 'status', 'ControlForm:' || f.legacy_id::text),
        f.control_date_out,
        f.control_time_out,
        migration.target_text(f.control_country_code_out, 'forms.compound_form', 'control_country_code', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.county, 'forms.compound_form', 'county', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.city, 'forms.compound_form', 'city', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.address, 'forms.compound_form', 'address', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.inspector_first_name_out, 'forms.compound_form', 'inspector_first_name', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.inspector_last_name_out, 'forms.compound_form', 'inspector_last_name', 'ControlForm:' || f.legacy_id::text),
        migration.target_text('-', 'forms.compound_form', 'inspector_organisation_id', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.inspector_unit_out, 'forms.compound_form', 'inspector_unit', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.inspector_profession_out, 'forms.compound_form', 'inspector_profession', 'ControlForm:' || f.legacy_id::text),
        jsonb_build_object('legacy_import', true, 'legacy_id', f.legacy_id,
                            'legacy_form_type', 'DangerousDelivery2012'),
        f.created_at,
        migration.target_text(f.created_by, 'forms.compound_form', 'created_by', 'ControlForm:' || f.legacy_id::text)
    FROM tmp_adr_numbered f
    RETURNING compound_form_key
),
ins_adr AS (
    INSERT INTO forms.adr_form (
        adr_form_key, compound_form_key, sub_form_number, version, status,
        result_type, proceeding_reference_number, created_at, created_by
    )
    SELECT
        f.adr_key,
        f.compound_key,
        migration.target_text(f.adr_form_number, 'forms.adr_form', 'sub_form_number', 'ControlForm:' || f.legacy_id::text),
        1,
        migration.target_text(f.status, 'forms.adr_form', 'status', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.result_type_out, 'forms.adr_form', 'result_type', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(NULL, 'forms.adr_form', 'proceeding_reference_number', 'ControlForm:' || f.legacy_id::text),
        f.created_at,
        migration.target_text(f.created_by, 'forms.adr_form', 'created_by', 'ControlForm:' || f.legacy_id::text)
    FROM tmp_adr_numbered f
    RETURNING adr_form_key, compound_form_key
)
INSERT INTO migration.form_link (
    legacy_source, legacy_id, legacy_form_type, legacy_created_date,
    target_table, target_key, target_form_number, migration_run_id)
SELECT 'ControlForm', f.legacy_id::text, 'DangerousDelivery2012', f.created_at,
       x.target_table, x.target_key, x.target_form_number, :'run_id'
FROM tmp_adr_numbered f
CROSS JOIN LATERAL (VALUES
    ('forms.compound_form', f.compound_key, f.compound_form_number),
    ('forms.adr_form',      f.adr_key,      f.adr_form_number)
) AS x(target_table, target_key, target_form_number)
;



INSERT INTO migration.quality_report
    (migration_run_id,legacy_source,legacy_id,target_table,column_name,issue,applied_default,raw_value)
SELECT :'run_id','ControlForm',f.legacy_id::text,'forms.compound_form','control_date',
       'derived_from_controlled_date',f.control_date_out::text,f.controlled_at::text
FROM tmp_adr_numbered f WHERE f.control_date IS NULL AND f.controlled_at IS NOT NULL;
