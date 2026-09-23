-- RoadControlCard2012 -> compound_form + vehicle_technical_form
-- Coordinated by migrate.py in one transaction. Incomplete business mappings
-- are permitted only on a disposable rehearsal target (see README.md).
-- Confirmed trailer/teammate discriminators BLOCK loading until routing is implemented.
-- Source EAV values, group membership and metadata remain in source_snapshot.

CREATE TEMP TABLE tmp_rcc_src ON COMMIT DROP AS
WITH candidate AS (
    SELECT cf.id, cf.control_stage, cf.created_date, cf.controlled_date, cf.created_by_user_id, cf.united_form_part
    FROM staging.raw_control_form cf
    WHERE cf.form_type_name = 'RoadControlCard2012'
      AND cf.control_stage IN ('Confirmed', 'Published')
      AND cf.created_date >= :'cutoff_from'::timestamp
      AND NOT EXISTS (
          SELECT 1 FROM migration.form_link fl
          WHERE fl.legacy_source = 'ControlForm' AND fl.legacy_id = cf.id::text
            AND fl.target_table = 'forms.vehicle_technical_form'
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
    max(v.value) FILTER (WHERE v.classifier_name = 'Inspector.Job')             AS inspector_profession,
    max(v.value) FILTER (WHERE v.classifier_name = 'Vehicle.RegNo')             AS vehicle_reg_nr,
    max(v.value) FILTER (WHERE v.classifier_name = 'Vehicle.Country')           AS vehicle_country_code,
    max(v.value) FILTER (WHERE v.classifier_name = 'Vehicle.Mark')              AS vehicle_make,
    max(v.value) FILTER (WHERE v.classifier_name = 'Vehicle.Model')             AS vehicle_model,
    max(v.value) FILTER (WHERE v.classifier_name = 'Vehicle.VinCode')           AS vehicle_vin,
    max(v.value) FILTER (WHERE v.classifier_name = 'Company.RegistryNumber')    AS company_reg_code,
    max(v.value) FILTER (WHERE v.classifier_name = 'Company.CompanyName')       AS company_name,
    max(v.value) FILTER (WHERE v.classifier_name = 'Company.CompanyAddress.Country') AS company_country_code,
    max(v.value) FILTER (WHERE v.classifier_name = 'Company.CompanyAddress.City')    AS company_city,
    max(v.value) FILTER (WHERE v.classifier_name = 'Company.CompanyAddress.Line1')   AS company_address,
    -- parts_summary source: caa_N_kontroll keys, values kontrollitud/on/ei_kontrollitud
    -- (see README.md for the mapping uncertainty around 'on').
    jsonb_agg(DISTINCT jsonb_build_object(
        'partCode', upper(replace(replace(v.classifier_name, '_kontroll', ''), 'caa_', 'CAA_')),
        'status', CASE v.value
                      WHEN 'kontrollitud'   THEN 'checked'
                      WHEN 'on'             THEN 'non_compliant'
                      WHEN 'ei_kontrollitud' THEN 'not_checked'
                      ELSE 'not_checked'
                  END
    )) FILTER (WHERE v.classifier_name LIKE 'caa\_%\_kontroll' ESCAPE '\') AS parts_summary_raw
    -- Outcomes are read from EAV otsus; dbo.ControlDecision is not joined.
FROM candidate c
LEFT JOIN staging.raw_control_form_value v ON v.control_form_id = c.id
GROUP BY c.id, c.control_stage, c.united_form_part, c.created_date, c.controlled_date, c.created_by_user_id;

CREATE TEMP TABLE tmp_rcc_mapped ON COMMIT DROP AS
SELECT
    s.*,
    nextval('forms.seq_compound_form_key') AS compound_key,
    nextval('forms.seq_vehicle_technical_form_key') AS vtf_key,
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
    migration.safe_country_code(s.vehicle_country_code, NULL)  AS vehicle_country_code_out,
    migration.safe_country_code(s.company_country_code, NULL)  AS company_country_code_out,
    coalesce(s.control_date::date, s.controlled_at::date, s.created_at::date)       AS control_date_out,
    -- control_time_raw is free text in the source; guard the cast instead of
    -- crashing the whole batch on one garbage value (see README.md).
    coalesce(migration.safe_time(s.control_time_raw), '00:00')  AS control_time_out,
    coalesce(s.parts_summary_raw, '[]'::jsonb)                AS parts_summary_out,
    -- A single confirmed EAV outcome is mapped. Missing/ambiguous outcomes
    -- use the rehearsal-only placeholder and produce unmapped_result below.
    coalesce(migration.legacy_result('technical', s.outcomes), 'ok') AS result_type_out
FROM tmp_rcc_src s
LEFT JOIN staging.raw_user u ON u.id = s.created_by_user_id
LEFT JOIN LATERAL (
    SELECT rv.user_name FROM staging.raw_versions rv
    WHERE rv.table_name = 'ControlForm' AND rv.row_id = s.legacy_id
    AND nullif(btrim(rv.user_name), '') IS NOT NULL
    ORDER BY rv.updated_time ASC NULLS LAST, rv.id ASC LIMIT 1
) ver ON true;

CREATE TEMP TABLE tmp_rcc_final ON COMMIT DROP AS
SELECT m.*,
       'koond-' || extract(year FROM m.created_at)::int || '-' || migration.number_suffix(m.compound_key) AS compound_form_number,
       'th-'    || extract(year FROM m.created_at)::int || '-' || migration.number_suffix(m.vtf_key)       AS vtf_form_number
FROM tmp_rcc_mapped m;

INSERT INTO migration.quality_report
    (migration_run_id, legacy_source, legacy_id, target_table, column_name, issue, applied_default, raw_value)
SELECT :'run_id', 'ControlForm', f.legacy_id::text, 'forms.compound_form', c.col, c.issue, c.applied, c.raw
FROM tmp_rcc_final f
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
SELECT :'run_id', 'ControlForm', f.legacy_id::text, 'forms.vehicle_technical_form',
       'parts_defects', 'unmapped_classifier', '[]',
       'RoadControlCard has 3 overlapping code-version layers (pre/post-2012, 2017, 2020) -- see README.md'
FROM tmp_rcc_final f;

INSERT INTO migration.quality_report
    (migration_run_id, legacy_source, legacy_id, target_table, column_name, issue, applied_default, raw_value)
SELECT :'run_id', 'ControlForm', f.legacy_id::text, 'forms.vehicle_technical_form',
       'result_type', 'unmapped_result', 'ok', array_to_string(f.outcomes, ',')
FROM tmp_rcc_final f
WHERE migration.legacy_result('technical', f.outcomes) IS NULL;

-- The real 2015+ "United" grouping (Control + ControlToFormBinding, see
-- staging.raw_control / raw_control_to_form_binding) is NOT assembled here --
-- every source row gets its own synthetic compound_form instead (see file
-- header). For rows where the source itself says this was part of a real
-- group (UnitedFormPart = true), that is a genuine data-model distortion, not
-- just missing enrichment: a real case that had Car + Trailer + Roadworthiness
-- sub-forms becomes three unrelated ljvis-2 cases. Recording it per-row (not
-- just once in README.md) is what makes the scale visible in sql/99-verify.sql.
INSERT INTO migration.quality_report
    (migration_run_id, legacy_source, legacy_id, target_table, column_name, issue, applied_default, raw_value)
SELECT :'run_id', 'ControlForm', f.legacy_id::text, 'forms.compound_form',
       'compound_form_key', 'compound_grouping_skipped', 'synthetic_standalone_case', 'united_form_part=true'
FROM tmp_rcc_final f
WHERE f.united_form_part;

INSERT INTO migration.quality_report
    (migration_run_id, legacy_source, legacy_id, target_table, column_name, issue, applied_default, raw_value)
SELECT :'run_id', 'ControlForm', f.legacy_id::text, 'forms.compound_form',
       'created_by', 'author_fallback', f.created_by, f.created_by_user_id::text
FROM tmp_rcc_final f WHERE f.author_fallback_used;

WITH ins_compound AS (
    INSERT INTO forms.compound_form (
        compound_form_key, form_number, control_year, template_version, status,
        control_date, control_time, control_country_code, county, city, address,
        inspector_first_name, inspector_last_name, inspector_organisation_id,
        inspector_unit, inspector_profession,
        vehicle_reg_nr, vehicle_country_code, vehicle_make, vehicle_model, vehicle_vin,
        company_reg_code, company_name, company_country_code, company_city, company_address,
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
        migration.target_text(f.vehicle_reg_nr, 'forms.compound_form', 'vehicle_reg_nr', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.vehicle_country_code_out, 'forms.compound_form', 'vehicle_country_code', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.vehicle_make, 'forms.compound_form', 'vehicle_make', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.vehicle_model, 'forms.compound_form', 'vehicle_model', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.vehicle_vin, 'forms.compound_form', 'vehicle_vin', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.company_reg_code, 'forms.compound_form', 'company_reg_code', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.company_name, 'forms.compound_form', 'company_name', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.company_country_code_out, 'forms.compound_form', 'company_country_code', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.company_city, 'forms.compound_form', 'company_city', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.company_address, 'forms.compound_form', 'company_address', 'ControlForm:' || f.legacy_id::text),
        jsonb_build_object('legacy_import', true, 'legacy_id', f.legacy_id,
                            'legacy_form_type', 'RoadControlCard2012'),
        f.created_at,
        migration.target_text(f.created_by, 'forms.compound_form', 'created_by', 'ControlForm:' || f.legacy_id::text)
    FROM tmp_rcc_final f
    RETURNING compound_form_key
),
ins_vtf AS (
    INSERT INTO forms.vehicle_technical_form (
        vehicle_technical_form_key, compound_form_key, sub_form_number, version, status,
        parts_summary, result_type, created_at, created_by
    )
    SELECT
        f.vtf_key,
        f.compound_key,
        migration.target_text(f.vtf_form_number, 'forms.vehicle_technical_form', 'sub_form_number', 'ControlForm:' || f.legacy_id::text),
        1,
        migration.target_text(f.status, 'forms.vehicle_technical_form', 'status', 'ControlForm:' || f.legacy_id::text),
        f.parts_summary_out,
        migration.target_text(f.result_type_out, 'forms.vehicle_technical_form', 'result_type', 'ControlForm:' || f.legacy_id::text),
        f.created_at,
        migration.target_text(f.created_by, 'forms.vehicle_technical_form', 'created_by', 'ControlForm:' || f.legacy_id::text)
    FROM tmp_rcc_final f
    RETURNING vehicle_technical_form_key, compound_form_key
)
INSERT INTO migration.form_link (
    legacy_source, legacy_id, legacy_form_type, legacy_created_date,
    target_table, target_key, target_form_number, migration_run_id)
SELECT 'ControlForm', f.legacy_id::text, 'RoadControlCard2012', f.created_at,
       x.target_table, x.target_key, x.target_form_number, :'run_id'
FROM tmp_rcc_final f
CROSS JOIN LATERAL (VALUES
    ('forms.compound_form',         f.compound_key, f.compound_form_number),
    ('forms.vehicle_technical_form', f.vtf_key,      f.vtf_form_number)
) AS x(target_table, target_key, target_form_number)
;



INSERT INTO migration.quality_report
    (migration_run_id,legacy_source,legacy_id,target_table,column_name,issue,applied_default,raw_value)
SELECT :'run_id','ControlForm',f.legacy_id::text,'forms.compound_form','control_date',
       'derived_from_controlled_date',f.control_date_out::text,f.controlled_at::text
FROM tmp_rcc_final f WHERE f.control_date IS NULL AND f.controlled_at IS NOT NULL;
