-- LJVIS1 ForeignViolate -> forms.foreign_violation_form
--
-- Standalone target table (no compound_form parent). All manually-created LJVIS1
-- rows are migrated with erru_message_id = NULL and source_police_form_key = NULL --
-- LJVIS1's ERRU integration was a separate legacy project, architecturally unrelated
-- to ljvis-2's ERRU/NU exchange (see README.md).
--
-- Parameters (psql -v): cutoff_from, run_id -- see 01-transform-good-repute.sql.




CREATE TEMP TABLE tmp_fv_src ON COMMIT DROP AS
WITH candidate AS (
    SELECT cf.id, cf.control_stage, cf.created_date, cf.controlled_date, cf.created_by_user_id
    FROM staging.raw_control_form cf
    WHERE cf.form_type_name = 'ForeignViolate'
      AND cf.control_stage IN ('Confirmed', 'Published')
      AND cf.created_date >= :'cutoff_from'::timestamp
      AND NOT EXISTS (
          SELECT 1 FROM migration.form_link fl
          WHERE fl.legacy_source = 'ControlForm' AND fl.legacy_id = cf.id::text
      )
)
SELECT
    c.id AS legacy_id, c.control_stage,
    (c.created_date AT TIME ZONE 'Europe/Tallinn') AS created_at,
    c.controlled_date AS controlled_at,
    c.created_by_user_id,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Inspector.FirstName')      AS inspector_first_name,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Inspector.LastName')       AS inspector_last_name,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Inspector.AmetiisikuAndmed') AS inspector_unit,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Inspector.Job')            AS inspector_profession,
    max(v.value)      FILTER (WHERE v.classifier_name = 'InspectionAddress.Country') AS reporting_country_code,
    max(coalesce(v.date_value, migration.safe_timestamp(v.value))) FILTER (WHERE v.classifier_name = 'InspectionDate.Date')      AS inspection_date,
    max(v.value)      FILTER (WHERE v.classifier_name = 'InspectionDate.Time')      AS inspection_time_raw,
    max(v.value)      FILTER (WHERE v.classifier_name = 'InspectionAddress.Line1')  AS inspection_address_line1,
    max(v.value)      FILTER (WHERE v.classifier_name = 'InspectionAddress.Line2')  AS inspection_address_line2,
    max(v.value)      FILTER (WHERE v.classifier_name = 'InspectionAddress.City')   AS inspection_city,
    max(v.value)      FILTER (WHERE v.classifier_name = 'InspectionAddress.Region') AS inspection_region,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Vehicle.RegNo')            AS vehicle_reg_nr,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Vehicle.Country')          AS vehicle_country_code,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Vehicle.Mark')             AS vehicle_make,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Vehicle.Model')            AS vehicle_model,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Vehicle.VinCode')          AS vehicle_vin,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Vehicle.CarBodyType')      AS vehicle_body_type,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Company.RegistryNumber')   AS company_reg_code,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Company.CompanyName')      AS company_name,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Company.CompanyAddress.Country') AS company_country_code,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Company.CompanyAddress.Line1')   AS company_address_line1,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Company.CompanyAddress.City')    AS company_city,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Company.CompanyAddress.Region')  AS company_region,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Company.TegevusloaNumber') AS licence_copy_number,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Driver.FirstName')         AS driver_first_name,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Driver.LastName')          AS driver_last_name
FROM candidate c
LEFT JOIN staging.raw_control_form_value v ON v.control_form_id = c.id
GROUP BY c.id, c.control_stage, c.created_date, c.controlled_date, c.created_by_user_id;

CREATE TEMP TABLE tmp_fv_final ON COMMIT DROP AS
SELECT
    s.*,
    nextval('forms.seq_foreign_violation_form_key') AS target_key,
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
    migration.safe_country_code(s.reporting_country_code)    AS reporting_country_code_out,
    migration.safe_country_code(s.vehicle_country_code, NULL)  AS vehicle_country_code_out,
    migration.safe_country_code(s.company_country_code, NULL)  AS company_country_code_out,
    coalesce(s.inspection_date::date, s.controlled_at::date, s.created_at::date)    AS inspection_date_out,
    -- inspection_time_raw is free text in the source; guard the cast instead of
    -- crashing the whole batch on one garbage value (see README.md).
    migration.safe_time(s.inspection_time_raw)                AS inspection_time_out
FROM tmp_fv_src s
LEFT JOIN staging.raw_user u ON u.id = s.created_by_user_id
LEFT JOIN LATERAL (
    SELECT rv.user_name FROM staging.raw_versions rv
    WHERE rv.table_name = 'ControlForm' AND rv.row_id = s.legacy_id
    AND nullif(btrim(rv.user_name), '') IS NOT NULL
    ORDER BY rv.updated_time ASC NULLS LAST, rv.id ASC LIMIT 1
) ver ON true;

INSERT INTO migration.quality_report
    (migration_run_id, legacy_source, legacy_id, target_table, column_name, issue, applied_default, raw_value)
SELECT :'run_id', 'ControlForm', f.legacy_id::text, 'forms.foreign_violation_form', c.col, c.issue, c.applied, c.raw
FROM tmp_fv_final f
CROSS JOIN LATERAL (VALUES
    ('inspector_first_name',    'missing_required', '-',  f.inspector_first_name),
    ('inspector_last_name',     'missing_required', '-',  f.inspector_last_name),
    ('inspector_unit',          'missing_required', '-',  f.inspector_unit),
    ('inspector_profession',    'missing_required', '-',  f.inspector_profession),
    ('reporting_country_code',  'missing_required', '-', f.reporting_country_code),
    ('inspection_date',         'missing_required', f.inspection_date_out::text, f.inspection_date::text),
    ('reporting_authority_name','no_source_field',  '-',  NULL),
    ('data_entry_date',         'derived_from_created_at', f.created_at::date::text, NULL)
) AS c(col, issue, applied, raw)
WHERE (c.col IN ('reporting_authority_name', 'data_entry_date'))
   OR coalesce(btrim(c.raw), '') = '';

INSERT INTO migration.quality_report
    (migration_run_id, legacy_source, legacy_id, target_table, column_name, issue, applied_default, raw_value)
SELECT :'run_id', 'ControlForm', f.legacy_id::text, 'forms.foreign_violation_form',
       'created_by', 'author_fallback', f.created_by, f.created_by_user_id::text
FROM tmp_fv_final f WHERE f.author_fallback_used;

-- Country fields are free text in the source (VARCHAR(3) target) -- anything
-- migration.safe_country_code() had to normalise away is reported here.
INSERT INTO migration.quality_report
    (migration_run_id, legacy_source, legacy_id, target_table, column_name, issue, applied_default, raw_value)
SELECT :'run_id', 'ControlForm', f.legacy_id::text, 'forms.foreign_violation_form', c.col,
       'value_truncated', c.applied, c.raw
FROM tmp_fv_final f
CROSS JOIN LATERAL (VALUES
    ('reporting_country_code', f.reporting_country_code_out, f.reporting_country_code),
    ('vehicle_country_code',   f.vehicle_country_code_out,   f.vehicle_country_code),
    ('company_country_code',   f.company_country_code_out,   f.company_country_code)
) AS c(col, applied, raw)
WHERE c.raw IS NOT NULL AND c.raw IS DISTINCT FROM c.applied;

WITH ins AS (
    INSERT INTO forms.foreign_violation_form (
        foreign_violation_form_key, form_number, template_version, status,
        erru_message_id, source_police_form_key, data_entry_date,
        inspector_first_name, inspector_last_name, inspector_organisation_id,
        inspector_unit, inspector_profession,
        reporting_country_code, reporting_authority_name,
        inspection_date, inspection_time,
        inspection_address_line1, inspection_address_line2, inspection_city,
        inspection_region, inspection_country_code,
        vehicle_reg_nr, vehicle_country_code, vehicle_make, vehicle_model, vehicle_vin, vehicle_body_type,
        company_reg_code, company_name, company_country_code, company_address_line1, company_city, company_region,
        driver_first_name, driver_last_name, licence_copy_number,
        created_at, created_by
    )
    SELECT
        f.target_key,
        migration.target_text('vr-' || extract(year FROM f.created_at)::int || '-' || migration.number_suffix(f.target_key), 'forms.foreign_violation_form', 'form_number', 'ControlForm:' || f.legacy_id::text),
        0,
        migration.target_text(f.status, 'forms.foreign_violation_form', 'status', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(NULL, 'forms.foreign_violation_form', 'erru_message_id', 'ControlForm:' || f.legacy_id::text),
        NULL,
        f.created_at::date,
        migration.target_text(f.inspector_first_name_out, 'forms.foreign_violation_form', 'inspector_first_name', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.inspector_last_name_out, 'forms.foreign_violation_form', 'inspector_last_name', 'ControlForm:' || f.legacy_id::text),
        migration.target_text('-', 'forms.foreign_violation_form', 'inspector_organisation_id', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.inspector_unit_out, 'forms.foreign_violation_form', 'inspector_unit', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.inspector_profession_out, 'forms.foreign_violation_form', 'inspector_profession', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.reporting_country_code_out, 'forms.foreign_violation_form', 'reporting_country_code', 'ControlForm:' || f.legacy_id::text),
        migration.target_text('-', 'forms.foreign_violation_form', 'reporting_authority_name', 'ControlForm:' || f.legacy_id::text),
        f.inspection_date_out,
        f.inspection_time_out,
        migration.target_text(f.inspection_address_line1, 'forms.foreign_violation_form', 'inspection_address_line1', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.inspection_address_line2, 'forms.foreign_violation_form', 'inspection_address_line2', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.inspection_city, 'forms.foreign_violation_form', 'inspection_city', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.inspection_region, 'forms.foreign_violation_form', 'inspection_region', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.reporting_country_code_out, 'forms.foreign_violation_form', 'inspection_country_code', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.vehicle_reg_nr, 'forms.foreign_violation_form', 'vehicle_reg_nr', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.vehicle_country_code_out, 'forms.foreign_violation_form', 'vehicle_country_code', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.vehicle_make, 'forms.foreign_violation_form', 'vehicle_make', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.vehicle_model, 'forms.foreign_violation_form', 'vehicle_model', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.vehicle_vin, 'forms.foreign_violation_form', 'vehicle_vin', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.vehicle_body_type, 'forms.foreign_violation_form', 'vehicle_body_type', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.company_reg_code, 'forms.foreign_violation_form', 'company_reg_code', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.company_name, 'forms.foreign_violation_form', 'company_name', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.company_country_code_out, 'forms.foreign_violation_form', 'company_country_code', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.company_address_line1, 'forms.foreign_violation_form', 'company_address_line1', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.company_city, 'forms.foreign_violation_form', 'company_city', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.company_region, 'forms.foreign_violation_form', 'company_region', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.driver_first_name, 'forms.foreign_violation_form', 'driver_first_name', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.driver_last_name, 'forms.foreign_violation_form', 'driver_last_name', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.licence_copy_number, 'forms.foreign_violation_form', 'licence_copy_number', 'ControlForm:' || f.legacy_id::text),
        f.created_at,
        migration.target_text(f.created_by, 'forms.foreign_violation_form', 'created_by', 'ControlForm:' || f.legacy_id::text)
    FROM tmp_fv_final f
    RETURNING foreign_violation_form_key, form_number
)
INSERT INTO migration.form_link (
    legacy_source, legacy_id, legacy_form_type, legacy_created_date,
    target_table, target_key, target_form_number, migration_run_id)
SELECT 'ControlForm', f.legacy_id::text, 'ForeignViolate', f.created_at,
       'forms.foreign_violation_form', i.foreign_violation_form_key, i.form_number, :'run_id'
FROM tmp_fv_final f
JOIN ins i ON i.foreign_violation_form_key = f.target_key
;

-- violations[] intentionally left at the column default ('[]') -- requires the
-- EU_INFRINGEMENT classifier lookup (see README.md).
-- Fill in as a follow-up UPDATE keyed by migration.form_link once that lookup exists.



INSERT INTO migration.quality_report
    (migration_run_id,legacy_source,legacy_id,target_table,column_name,issue,applied_default,raw_value)
SELECT :'run_id','ControlForm',f.legacy_id::text,'forms.foreign_violation_form','inspection_date',
       'derived_from_controlled_date',f.inspection_date_out::text,f.controlled_at::text
FROM tmp_fv_final f WHERE f.inspection_date IS NULL AND f.controlled_at IS NOT NULL;
