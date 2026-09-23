-- LJVIS1 TransportInterruption -> forms.kv_form (+ synthetic forms.compound_form parent)
--
-- kv_form requires a compound parent. This rehearsal implementation creates
-- a separate parent; real Control/ControlToFormBinding grouping is a blocker.
-- Executed only through migrate.py, in its common transaction.
-- Idempotent: re-running skips rows already present in migration.form_link for kv_form.




-- ── 1. Pivot EAV -> one row per form (LEFT JOIN: a form with zero EAV rows is
--    reported, not silently dropped -- see sql/99-verify.sql section 1) ──────
CREATE TEMP TABLE tmp_ti_src ON COMMIT DROP AS
WITH candidate AS (
    SELECT cf.id, cf.control_stage, cf.created_date, cf.controlled_date, cf.created_by_user_id, cf.united_form_part
    FROM staging.raw_control_form cf
    WHERE cf.form_type_name = 'TransportInterruption'
      AND cf.control_stage IN ('Confirmed', 'Published')
      AND cf.created_date >= :'cutoff_from'::timestamp
      AND NOT EXISTS (
          SELECT 1 FROM migration.form_link fl
          WHERE fl.legacy_source = 'ControlForm' AND fl.legacy_id = cf.id::text
            AND fl.target_table = 'forms.kv_form'
      )
)
SELECT
    c.id AS legacy_id, c.control_stage, c.united_form_part,
    (c.created_date AT TIME ZONE 'Europe/Tallinn') AS created_at,
    c.controlled_date AS controlled_at,
    c.created_by_user_id,
    max(v.value)      FILTER (WHERE v.classifier_name = 'InspectionAddress.Country') AS control_country_code,
    max(v.value)      FILTER (WHERE v.classifier_name = 'InspectionAddress.Region')  AS county,
    max(v.value)      FILTER (WHERE v.classifier_name = 'InspectionAddress.City')    AS city,
    max(v.value)      FILTER (WHERE v.classifier_name = 'InspectionAddress.Line1')   AS address,
    max(coalesce(v.date_value, migration.safe_timestamp(v.value))) FILTER (WHERE v.classifier_name = 'InspectionDate.Date')       AS control_date,
    max(v.value)      FILTER (WHERE v.classifier_name = 'InspectionDate.Time')       AS control_time_raw,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Inspector.FirstName')       AS inspector_first_name,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Inspector.LastName')        AS inspector_last_name,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Inspector.AmetiisikuAndmed') AS inspector_unit,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Inspector.Job')             AS inspector_profession,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Header')                    AS header_text,
    max(v.value)      FILTER (WHERE v.classifier_name = 'ResidenceAddress.Country')  AS residence_country,
    max(v.value)      FILTER (WHERE v.classifier_name = 'ResidenceAddress.Region')   AS residence_region,
    max(v.value)      FILTER (WHERE v.classifier_name = 'ResidenceAddress.City')     AS residence_city,
    max(v.value)      FILTER (WHERE v.classifier_name = 'ResidenceAddress.Line1')    AS residence_address_line,
    max(v.value)      FILTER (WHERE v.classifier_name = 'ResidenceAddress.PostalCode') AS residence_postal_code,
    max(v.value)      FILTER (WHERE v.classifier_name = 'InterruptionReason')        AS interruption_reason,
    max(v.value)      FILTER (WHERE v.classifier_name = 'InterruptionCondition')     AS termination_condition,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Applications')              AS person_applications
FROM candidate c
LEFT JOIN staging.raw_control_form_value v ON v.control_form_id = c.id
GROUP BY c.id, c.control_stage, c.united_form_part, c.created_date, c.controlled_date, c.created_by_user_id;

-- ── 2. Resolve author (4-level fallback, see README.md), allocate keys.
--    Sequences are called here (not inside the INSERTs below) so both the
--    compound_form row and the kv_form row can reference the SAME generated
--    compound_form_key without relying on a fragile RETURNING/timestamp join.
CREATE TEMP TABLE tmp_ti_mapped ON COMMIT DROP AS
SELECT
    s.*,
    nextval('forms.seq_compound_form_key') AS compound_key,
    nextval('forms.seq_kv_form_key')       AS kv_key,
    CASE s.control_stage WHEN 'Published' THEN 'published' ELSE 'confirmed' END AS status,
    coalesce(
        nullif(btrim(u.personal_code), ''),
        nullif(btrim(concat_ws(' ', u.first_name, u.last_name)), ''),
        nullif(btrim(ver.user_name), ''),
        '-'
    ) AS created_by,
    (u.personal_code IS NULL OR btrim(u.personal_code) = '') AS author_fallback_used
FROM tmp_ti_src s
LEFT JOIN staging.raw_user u ON u.id = s.created_by_user_id
LEFT JOIN LATERAL (
    SELECT rv.user_name
    FROM staging.raw_versions rv
    WHERE rv.table_name = 'ControlForm' AND rv.row_id = s.legacy_id
    AND nullif(btrim(rv.user_name), '') IS NOT NULL
    ORDER BY rv.updated_time ASC NULLS LAST, rv.id ASC
    LIMIT 1
) ver ON true;

CREATE TEMP TABLE tmp_ti_final ON COMMIT DROP AS
SELECT m.*,
       'koond-' || extract(year FROM m.created_at)::int || '-' || migration.number_suffix(m.compound_key) AS compound_form_number,
       'ko-'    || extract(year FROM m.created_at)::int || '-' || migration.number_suffix(m.kv_key)       AS kv_form_number,
       coalesce(nullif(btrim(m.inspector_first_name), ''), '-') AS inspector_first_name_out,
       coalesce(nullif(btrim(m.inspector_last_name),  ''), '-') AS inspector_last_name_out,
       coalesce(nullif(btrim(m.inspector_unit),       ''), '-') AS inspector_unit_out,
       coalesce(nullif(btrim(m.inspector_profession), ''), '-') AS inspector_profession_out,
       migration.safe_country_code(m.control_country_code)      AS control_country_code_out,
       coalesce(m.control_date::date, m.created_at::date)       AS control_date_out,
       -- control_time_raw is free text in the source; guard the cast instead of
       -- crashing the whole batch on one garbage value (see README.md).
       coalesce(migration.safe_time(m.control_time_raw), '00:00')  AS control_time_out,
       migration.safe_country_code(m.residence_country)         AS residence_country_out,
       upper(coalesce(nullif(btrim(m.termination_condition), ''),
             'KUNI VEO KATKESTAMISE ALUSE ARALANGEMISENI.'))    AS termination_condition_out
FROM tmp_ti_mapped m;

-- ── 3. Quality report BEFORE the insert ─────────────────────────────────────
INSERT INTO migration.quality_report
    (migration_run_id, legacy_source, legacy_id, target_table, column_name, issue, applied_default, raw_value)
SELECT :'run_id', 'ControlForm', f.legacy_id::text, t.target_table, c.col, c.issue, c.applied, c.raw
FROM tmp_ti_final f
CROSS JOIN LATERAL (VALUES ('forms.compound_form'), ('forms.kv_form')) AS t(target_table)
CROSS JOIN LATERAL (VALUES
    ('inspector_first_name', 'missing_required', '-', f.inspector_first_name),
    ('inspector_last_name',  'missing_required', '-', f.inspector_last_name),
    ('inspector_unit',       'missing_required', '-', f.inspector_unit),
    ('inspector_profession', 'missing_required', '-', f.inspector_profession),
    ('control_country_code', 'missing_required', '-', f.control_country_code),
    ('control_date',         'missing_required', f.control_date_out::text, f.control_date::text)
) AS c(col, issue, applied, raw)
WHERE coalesce(btrim(c.raw), '') = ''
  AND t.target_table = 'forms.compound_form';

INSERT INTO migration.quality_report
    (migration_run_id, legacy_source, legacy_id, target_table, column_name, issue, applied_default, raw_value)
SELECT :'run_id', 'ControlForm', f.legacy_id::text, 'forms.kv_form',
       'created_by', 'author_fallback', f.created_by, f.created_by_user_id::text
FROM tmp_ti_final f
WHERE f.author_fallback_used;

-- See 04-transform-compound-and-technical.sql for the full explanation: the
-- real 2015+ "United" grouping is not assembled, every row gets its own
-- synthetic compound_form.
INSERT INTO migration.quality_report
    (migration_run_id, legacy_source, legacy_id, target_table, column_name, issue, applied_default, raw_value)
SELECT :'run_id', 'ControlForm', f.legacy_id::text, 'forms.compound_form',
       'compound_form_key', 'compound_grouping_skipped', 'synthetic_standalone_case', 'united_form_part=true'
FROM tmp_ti_final f
WHERE f.united_form_part;

-- ── 4. Insert compound_form (synthetic parent), then kv_form, then link both.
--    inspector_organisation_id has no LJVIS1 source at all (see field-mapping
--    notes) -- always '-', flagged once here rather than once per row above.
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
                            'legacy_form_type', 'TransportInterruption'),
        f.created_at,
        migration.target_text(f.created_by, 'forms.compound_form', 'created_by', 'ControlForm:' || f.legacy_id::text)
    FROM tmp_ti_final f
    RETURNING compound_form_key
),
ins_kv AS (
    INSERT INTO forms.kv_form (
        kv_form_key, compound_form_key, sub_form_number, version, status,
        header_text, residence_country, residence_region, residence_city,
        residence_address_line, residence_postal_code,
        interruption_reason, termination_condition, person_applications,
        created_at, created_by
    )
    SELECT
        f.kv_key,
        f.compound_key,
        migration.target_text(f.kv_form_number, 'forms.kv_form', 'sub_form_number', 'ControlForm:' || f.legacy_id::text),
        1,
        migration.target_text(f.status, 'forms.kv_form', 'status', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.header_text, 'forms.kv_form', 'header_text', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.residence_country_out, 'forms.kv_form', 'residence_country', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.residence_region, 'forms.kv_form', 'residence_region', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.residence_city, 'forms.kv_form', 'residence_city', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.residence_address_line, 'forms.kv_form', 'residence_address_line', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.residence_postal_code, 'forms.kv_form', 'residence_postal_code', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(coalesce(nullif(btrim(f.interruption_reason), ''), '-'), 'forms.kv_form', 'interruption_reason', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.termination_condition_out, 'forms.kv_form', 'termination_condition', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.person_applications, 'forms.kv_form', 'person_applications', 'ControlForm:' || f.legacy_id::text),
        f.created_at,
        migration.target_text(f.created_by, 'forms.kv_form', 'created_by', 'ControlForm:' || f.legacy_id::text)
    FROM tmp_ti_final f
    RETURNING kv_form_key, compound_form_key
)
INSERT INTO migration.form_link (
    legacy_source, legacy_id, legacy_form_type, legacy_created_date,
    target_table, target_key, target_form_number, migration_run_id)
SELECT 'ControlForm', f.legacy_id::text, 'TransportInterruption', f.created_at,
       x.target_table, x.target_key, x.target_form_number, :'run_id'
FROM tmp_ti_final f
CROSS JOIN LATERAL (VALUES
    ('forms.compound_form', f.compound_key, f.compound_form_number),
    ('forms.kv_form',       f.kv_key,       f.kv_form_number)
) AS x(target_table, target_key, target_form_number)
;

-- legal_bases[] intentionally left at its column default -- requires the
-- TransportInterruptionOptionClassifier -> INTERRUPTION_BASES lookup table,
-- which needs the real classifier.classifier_value rows to build (see
-- README.md). Fill in as a follow-up UPDATE
-- keyed by migration.form_link once that lookup exists.



INSERT INTO migration.quality_report
    (migration_run_id,legacy_source,legacy_id,target_table,column_name,issue,applied_default,raw_value)
SELECT :'run_id','ControlForm',f.legacy_id::text,'forms.compound_form','control_date',
       'derived_from_controlled_date',f.control_date_out::text,f.controlled_at::text
FROM tmp_ti_final f WHERE f.control_date IS NULL AND f.controlled_at IS NOT NULL;
