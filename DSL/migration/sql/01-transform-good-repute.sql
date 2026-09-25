-- LJVIS1 GoodRepute -> forms.good_repute_form
--
-- Reference implementation: every other transform in this directory follows the same
-- four-step shape (pivot -> map+default -> quality report -> insert+link). GoodRepute
-- was chosen first because all ten of its EAV keys are confirmed directly in the LJVIS1
-- view template (GoodRepute.ascx) -- see README.md.
--
-- Parameters (psql -v):
--   cutoff_from     lower bound on ControlForm.CreatedDate, e.g. '2023-01-01'
--   run_id          uuid identifying this migration run
--
-- Idempotent: re-running skips rows already present in migration.form_link.




-- ── 1. Pivot EAV -> one row per form ────────────────────────────────────────
-- max(value) FILTER (...) is safe here ONLY because every GoodRepute key is
-- single-valued. For form types with checkbox groups the same construct would
-- silently pick an arbitrary value out of several -- use array_agg/bool_or there
-- (see sql/99-verify.sql section 7 for how to detect which keys are multi-valued).
CREATE TEMP TABLE tmp_gr_src ON COMMIT DROP AS
WITH candidate AS (
    SELECT cf.id,
           cf.control_stage,
           cf.created_date,
           cf.controlled_date,
           cf.form_code,
           cf.created_by_user_id
    FROM staging.raw_control_form cf
    WHERE cf.form_type_name = 'GoodRepute'
      AND cf.control_stage IN ('Confirmed', 'Published')
      -- Range is on CreatedDate. NULL created_date is excluded by this predicate;
      -- those rows are reported separately below rather than vanishing silently.
      AND cf.created_date >= :'cutoff_from'::timestamp
      AND NOT EXISTS (
          SELECT 1 FROM migration.form_link fl
          WHERE fl.legacy_source = 'ControlForm'
            AND fl.legacy_id = cf.id::text
      )
)
SELECT
    c.id                                        AS legacy_id,
    c.control_stage,
    c.form_code                                 AS legacy_form_code,
    -- Europe/Tallinn: the source stores naive local server time.
    (c.created_date    AT TIME ZONE 'Europe/Tallinn') AS created_at,
    (c.controlled_date AT TIME ZONE 'Europe/Tallinn') AS controlled_at,
    c.created_by_user_id,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Driver.Isikukood')      AS personal_code,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Driver.Eesnimi')        AS first_name,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Driver.Perekonnanimi')  AS last_name,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Driver.Synnikoht')      AS place_of_birth,
    max(v.value)      FILTER (WHERE v.classifier_name = 'AmetialasePadevuseTunnistuseNumber') AS certificate_number,
    max(v.value)      FILTER (WHERE v.classifier_name = 'AmetialasePadevuseTunnistuseValjastanudRiik') AS certificate_country,
    max(v.value)      FILTER (WHERE v.classifier_name = 'Sobivus')               AS sobivus_raw,
    -- Dates: prefer date_value (written by DateTimeControlFormBinder); the text
    -- value for the same key is a dd.MM.yyyy rendering and is only a fallback.
    max(coalesce(v.date_value, migration.safe_timestamp(v.value))) FILTER (WHERE v.classifier_name = 'Driver.Birthdate')      AS date_of_birth,
    max(coalesce(v.date_value, migration.safe_timestamp(v.value))) FILTER (WHERE v.classifier_name = 'AmetialasePadevuseTunnistuseValjaandmiseKuupaev') AS certificate_issue_date,
    max(coalesce(v.date_value, migration.safe_timestamp(v.value))) FILTER (WHERE v.classifier_name = 'SobimatuksKuulutamiseAlguskuupaev')  AS unfit_from_date,
    max(coalesce(v.date_value, migration.safe_timestamp(v.value))) FILTER (WHERE v.classifier_name = 'SobimatuksKuulutamiseLoppkuupaev')   AS unfit_until_date
FROM candidate c
LEFT JOIN staging.raw_control_form_value v ON v.control_form_id = c.id
GROUP BY c.id, c.control_stage, c.form_code, c.created_date, c.controlled_date, c.created_by_user_id;

-- ── 2. Apply defaults, resolve author, allocate keys ────────────────────────
CREATE TEMP TABLE tmp_gr_mapped ON COMMIT DROP AS
SELECT
    s.*,
    nextval('forms.seq_good_repute_form_key')                       AS target_key,
    CASE s.control_stage WHEN 'Published' THEN 'published'
                         WHEN 'Confirmed' THEN 'confirmed' END      AS status,
    -- Author: 4-level fallback -- personal code if the user still exists,
    -- else display name from User, else Versions.UserName (earliest audit
    -- snapshot of this ControlForm row), else '-'. Accounts are never
    -- created (see README.md). All four levels, not just two --
    -- an earlier draft of this file skipped the Versions fallback.
    coalesce(
        nullif(btrim(u.personal_code), ''),
        nullif(btrim(concat_ws(' ', u.first_name, u.last_name)), ''),
        nullif(btrim(ver.user_name), ''),
        '-'
    )                                                               AS created_by,
    (u.personal_code IS NULL OR btrim(u.personal_code) = '')        AS author_fallback_used,
    -- Required-but-missing -> '-'. Note '-' is LJVIS1's own GetValue() default,
    -- so it may already be present in the source; quality_report distinguishes
    -- "we substituted" from "source already had it".
    coalesce(nullif(btrim(s.personal_code),      ''), '-')           AS personal_code_out,
    coalesce(nullif(btrim(s.first_name),         ''), '-')           AS first_name_out,
    coalesce(nullif(btrim(s.last_name),          ''), '-')           AS last_name_out,
    coalesce(nullif(btrim(s.certificate_number), ''), '-')           AS certificate_number_out,
    -- Present in the supplied backup although absent from the older view snapshot.
    coalesce(nullif(upper(btrim(s.certificate_country)), ''), '-')     AS certificate_country_code_out,
    -- date_of_birth / certificate_issue_date are NOT NULL with a <= CURRENT_DATE
    -- check. Fall back to the form's own date, then clamp.
    least(coalesce(s.date_of_birth, s.created_at)::date,           CURRENT_DATE) AS date_of_birth_out,
    least(coalesce(s.certificate_issue_date, s.created_at)::date,  CURRENT_DATE) AS certificate_issue_date_out,
    CASE lower(btrim(coalesce(s.sobivus_raw, '')))
         WHEN 'sobimatu' THEN 'unfit'
         WHEN 'sobiv'    THEN 'fit'
         ELSE NULL                      -- anything else is escalated, never guessed
    END                                                             AS fitness_status
FROM tmp_gr_src s
LEFT JOIN staging.raw_user u ON u.id = s.created_by_user_id
LEFT JOIN LATERAL (
    SELECT rv.user_name FROM staging.raw_versions rv
    WHERE rv.table_name = 'ControlForm' AND rv.row_id = s.legacy_id
    AND nullif(btrim(rv.user_name), '') IS NOT NULL
    ORDER BY rv.updated_time ASC NULLS LAST, rv.id ASC LIMIT 1
) ver ON true;

-- chk_grf_unfit_dates_required: unfit requires both dates.
-- chk_grf_unfit_until_after_from: until > from, strictly.
CREATE TEMP TABLE tmp_gr_final ON COMMIT DROP AS
SELECT m.*,
       CASE WHEN m.fitness_status = 'unfit'
            THEN coalesce(m.unfit_from_date::date, m.created_at::date) END AS unfit_from_out,
       CASE WHEN m.fitness_status = 'unfit'
            THEN greatest(
                     coalesce(m.unfit_until_date::date, m.created_at::date + 1),
                     coalesce(m.unfit_from_date::date,  m.created_at::date) + 1)
            END                                                            AS unfit_until_out,
       'mv-' || extract(year FROM m.created_at)::int || '-'
              || migration.number_suffix(m.target_key)                          AS form_number
FROM tmp_gr_mapped m;

-- ── 3. Quality report BEFORE the insert ────────────────────────────────────
INSERT INTO migration.quality_report
    (migration_run_id, legacy_source, legacy_id, target_table, column_name,
     issue, applied_default, raw_value)
SELECT :'run_id', 'ControlForm', f.legacy_id::text, 'forms.good_repute_form', c.col,
       c.issue, c.applied, c.raw
FROM tmp_gr_final f
CROSS JOIN LATERAL (VALUES
    ('personal_code',            'missing_required',   '-', f.personal_code),
    ('first_name',               'missing_required',   '-', f.first_name),
    ('last_name',                'missing_required',   '-', f.last_name),
    ('certificate_number',       'missing_required',   '-', f.certificate_number),
    ('certificate_country_code', 'missing_required',   '-', f.certificate_country),
    ('date_of_birth',            'missing_required',   f.date_of_birth_out::text,          f.date_of_birth::text),
    ('certificate_issue_date',   'missing_required',   f.certificate_issue_date_out::text, f.certificate_issue_date::text),
    ('fitness_status',           'unmapped_classifier', NULL,                              f.sobivus_raw)
) AS c(col, issue, applied, raw)
WHERE (c.col = 'certificate_country_code' AND nullif(btrim(c.raw),'') IS NULL)
   OR (c.col = 'fitness_status' AND f.fitness_status IS NULL)
   OR (c.col IN ('date_of_birth', 'certificate_issue_date') AND c.raw IS NULL)
   OR (c.col NOT IN ('certificate_country_code', 'fitness_status',
                     'date_of_birth', 'certificate_issue_date')
       AND coalesce(btrim(c.raw), '') = '');

INSERT INTO migration.quality_report
    (migration_run_id, legacy_source, legacy_id, target_table, column_name,
     issue, applied_default, raw_value)
SELECT :'run_id', 'ControlForm', f.legacy_id::text, 'forms.good_repute_form',
       'created_by', 'author_fallback', f.created_by, f.created_by_user_id::text
FROM tmp_gr_final f
WHERE f.author_fallback_used;

-- Rows dropped by the range predicate because CreatedDate is NULL. These rows
-- never enter tmp_gr_src (no created_date to filter on) and never reach
-- migration.form_link, so unlike everything else in this file they cannot be
-- de-duplicated via the usual "already linked" check -- guard directly against
-- quality_report instead, or a re-run logs the same exclusion every time.
INSERT INTO migration.quality_report
    (migration_run_id, legacy_source, legacy_id, target_table, column_name,
     issue, applied_default, raw_value)
SELECT :'run_id', 'ControlForm', cf.id::text, 'forms.good_repute_form',
       'created_date', 'excluded_null_created_date', NULL, NULL
FROM staging.raw_control_form cf
WHERE cf.form_type_name = 'GoodRepute'
  AND cf.control_stage IN ('Confirmed', 'Published')
  AND cf.created_date IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM migration.quality_report qr
      WHERE qr.legacy_source = 'ControlForm' AND qr.legacy_id = cf.id::text
        AND qr.target_table = 'forms.good_repute_form'
        AND qr.column_name = 'created_date' AND qr.issue = 'excluded_null_created_date'
  );

-- Report every adjusted date, including legal unfitness periods. Retain the
-- original source in source_snapshot; these are rehearsal substitutions.
INSERT INTO migration.quality_report
    (migration_run_id,legacy_source,legacy_id,target_table,column_name,issue,applied_default,raw_value)
SELECT :'run_id','ControlForm',f.legacy_id::text,'forms.good_repute_form',x.col,
       'date_adjusted',x.applied::text,x.raw::text
FROM tmp_gr_final f CROSS JOIN LATERAL (VALUES
    ('date_of_birth',f.date_of_birth_out,f.date_of_birth::date),
    ('certificate_issue_date',f.certificate_issue_date_out,f.certificate_issue_date::date),
    ('unfit_from_date',f.unfit_from_out,f.unfit_from_date::date),
    ('unfit_until_date',f.unfit_until_out,f.unfit_until_date::date)
) x(col,applied,raw)
WHERE x.applied IS NOT NULL AND x.applied IS DISTINCT FROM x.raw;

-- ── 4. Insert. fitness_status IS NULL never reaches forms.* ─────────────────
WITH ins AS (
    INSERT INTO forms.good_repute_form (
        good_repute_form_key, form_number, version, status,
        personal_code, first_name, last_name, date_of_birth, place_of_birth,
        certificate_number, certificate_issue_date, certificate_country_code,
        fitness_status, unfit_from_date, unfit_until_date,
        created_at, created_by
    )
    SELECT
        f.target_key,
        migration.target_text(f.form_number, 'forms.good_repute_form', 'form_number', 'ControlForm:' || f.legacy_id::text),
        1,
        migration.target_text(f.status, 'forms.good_repute_form', 'status', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.personal_code_out, 'forms.good_repute_form', 'personal_code', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.first_name_out, 'forms.good_repute_form', 'first_name', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.last_name_out, 'forms.good_repute_form', 'last_name', 'ControlForm:' || f.legacy_id::text),
        f.date_of_birth_out,
        migration.target_text(nullif(btrim(coalesce(f.place_of_birth, '')), ''), 'forms.good_repute_form', 'place_of_birth', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.certificate_number_out, 'forms.good_repute_form', 'certificate_number', 'ControlForm:' || f.legacy_id::text),
        f.certificate_issue_date_out,
        migration.target_text(f.certificate_country_code_out, 'forms.good_repute_form', 'certificate_country_code', 'ControlForm:' || f.legacy_id::text),
        migration.target_text(f.fitness_status, 'forms.good_repute_form', 'fitness_status', 'ControlForm:' || f.legacy_id::text),
        f.unfit_from_out,
        f.unfit_until_out,
        f.created_at,
        migration.target_text(f.created_by, 'forms.good_repute_form', 'created_by', 'ControlForm:' || f.legacy_id::text)
    FROM tmp_gr_final f
    WHERE f.fitness_status IS NOT NULL
    RETURNING good_repute_form_key, form_number
)
INSERT INTO migration.form_link (
    legacy_source, legacy_id, legacy_form_code, legacy_form_type, legacy_created_date,
    target_table, target_key, target_form_number, migration_run_id)
SELECT 'ControlForm', f.legacy_id::text, f.legacy_form_code, 'GoodRepute', f.created_at,
       'forms.good_repute_form', f.target_key, f.form_number, :'run_id'
FROM tmp_gr_final f
JOIN ins ON ins.good_repute_form_key = f.target_key
;

-- Forms with fitness_status still NULL after mapping ('Sobivus' held something
-- other than 'sobiv'/'sobimatu') are neither inserted nor linked -- they need a
-- human decision, not a guess. Report them so they are visible, not silently
-- lost. Same as above: never linked, so guard against quality_report directly.
INSERT INTO migration.quality_report
    (migration_run_id, legacy_source, legacy_id, target_table, column_name,
     issue, applied_default, raw_value)
SELECT :'run_id', 'ControlForm', f.legacy_id::text, 'forms.good_repute_form',
       'fitness_status', 'escalated_not_inserted', NULL, f.sobivus_raw
FROM tmp_gr_final f
WHERE f.fitness_status IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM migration.quality_report qr
      WHERE qr.legacy_source = 'ControlForm' AND qr.legacy_id = f.legacy_id::text
        AND qr.target_table = 'forms.good_repute_form'
        AND qr.column_name = 'fitness_status' AND qr.issue = 'escalated_not_inserted'
  );


