-- liquibase formatted sql
-- changeset ljvis:20261112110000 ignore:true splitStatements:false
--
-- ADR-002: TRAM kontrollkaart on nüüd üks eraldiseisev olem (forms.tram_control_card),
-- mitte compound_form(authority='TRAM') + sp_driver_form paar.
--   * compound / sp_driver harud loevad ainult PPA ridu (WHERE authority = 'PPA')
--     ja ei väljasta enam 'tram_compound' / 'tram_driver' tüüpe
--   * uus UNION-haru: form_type = 'tram_control_card', allikas forms.tram_control_card
-- Fork DSL/Liquibase/changelog/20261101130000-form-search-vr-filters.sql-ist.
--

CREATE OR REPLACE VIEW forms.form_search AS
WITH lc AS (
    SELECT DISTINCT ON (compound_form_key) *
    FROM forms.compound_form
    ORDER BY compound_form_key, created_at DESC
),
compound_valid AS (
    SELECT * FROM lc WHERE status <> 'deleted' AND authority = 'PPA'
),
lsd AS (
    SELECT DISTINCT ON (sp_driver_form_key) *
    FROM forms.sp_driver_form
    ORDER BY sp_driver_form_key, created_at DESC
),
lst AS (
    SELECT DISTINCT ON (sp_teammate_form_key) *
    FROM forms.sp_teammate_form
    ORDER BY sp_teammate_form_key, created_at DESC
),
lvt AS (
    SELECT DISTINCT ON (vehicle_technical_form_key) *
    FROM forms.vehicle_technical_form
    ORDER BY vehicle_technical_form_key, created_at DESC
),
ltt AS (
    SELECT DISTINCT ON (trailer_technical_form_key) *
    FROM forms.trailer_technical_form
    ORDER BY trailer_technical_form_key, created_at DESC
),
ladr AS (
    SELECT DISTINCT ON (adr_form_key) *
    FROM forms.adr_form
    ORDER BY adr_form_key, created_at DESC
),
lkv AS (
    SELECT DISTINCT ON (kv_form_key) *
    FROM forms.kv_form
    ORDER BY kv_form_key, created_at DESC
)
-- ── compound (koondvorm) — ainult PPA ──────────────────────────────────
SELECT
    'compound'::text                                            AS form_type,
    cf.compound_form_key                                        AS form_key,
    cf.compound_form_key                                        AS compound_form_key,
    cf.form_number                                              AS form_number,
    cf.status                                                   AS status,
    cf.control_date                                             AS main_date,
    cf.county                                                   AS county,
    cf.vehicle_reg_nr                                           AS vehicle_reg_nr,
    cf.company_reg_code                                         AS company_reg_code,
    cf.company_name                                             AS company_name,
    (SELECT lower(string_agg(
        concat_ws(' ', d->>'personal_code_ee', d->>'personal_code_foreign',
                       d->>'first_name', d->>'last_name'), ' '))
     FROM jsonb_array_elements(cf.drivers) AS d)                AS driver_search,
    cf.inspector_organisation_id                                AS inspector_org_id,
    concat_ws(' ', cf.inspector_first_name, cf.inspector_last_name) AS inspector_name,
    false                                                       AS has_violation,
    cf.created_at                                               AS created_at,
    cf.created_by                                               AS created_by,
    NULL::text                                                  AS vr_reporting_country_code,
    NULL::text                                                  AS vr_sanction_code
FROM compound_valid cf

UNION ALL
-- ── foreign_violation (välisriigi rikkumine, standalone) ────────────────
SELECT
    'foreign_violation',
    fv.foreign_violation_form_key,
    NULL::bigint,
    fv.form_number,
    fv.status,
    fv.inspection_date,
    fv.inspection_region,
    fv.vehicle_reg_nr,
    fv.company_reg_code,
    fv.company_name,
    lower(concat_ws(' ', fv.driver_first_name, fv.driver_last_name)),
    fv.inspector_organisation_id,
    concat_ws(' ', fv.inspector_first_name, fv.inspector_last_name),
    (fv.sanction_code <> 'KORRAS' OR fv.violations <> '[]'::jsonb),
    fv.created_at,
    fv.created_by,
    fv.reporting_country_code,
    fv.sanction_code
FROM (
    SELECT DISTINCT ON (foreign_violation_form_key) *
    FROM forms.foreign_violation_form
    ORDER BY foreign_violation_form_key, created_at DESC
) fv
WHERE fv.status <> 'deleted'

UNION ALL
-- ── labour_inspection (Tööinspektsiooni kontrollvorm, standalone) ───────
SELECT
    'labour_inspection',
    li.labour_inspection_form_key,
    NULL::bigint,
    li.form_number,
    li.status,
    li.inspection_date,
    NULL::varchar,
    NULL::varchar,
    li.company_reg_code,
    li.company_name,
    lower(concat_ws(' ', li.punished_person_id_code,
                         li.punished_person_first_name,
                         li.punished_person_last_name)),
    NULL::varchar,
    li.inspector_name,
    (li.violations <> '[]'::jsonb),
    li.created_at,
    li.created_by,
    NULL::text,
    NULL::text
FROM (
    SELECT DISTINCT ON (labour_inspection_form_key) *
    FROM forms.labour_inspection_form
    ORDER BY labour_inspection_form_key, created_at DESC
) li
WHERE li.status <> 'deleted'

UNION ALL
-- ── good_repute (Hea maine vorm, standalone) ────────────────────────────
SELECT
    'good_repute',
    gr.good_repute_form_key,
    NULL::bigint,
    gr.form_number,
    gr.status,
    gr.certificate_issue_date,
    NULL::varchar,
    NULL::varchar,
    NULL::varchar,
    NULL::varchar,
    lower(concat_ws(' ', gr.personal_code, gr.first_name, gr.last_name)),
    NULL::varchar,
    NULL::varchar,
    (gr.fitness_status = 'unfit'),
    gr.created_at,
    gr.created_by,
    NULL::text,
    NULL::text
FROM (
    SELECT DISTINCT ON (good_repute_form_key) *
    FROM forms.good_repute_form
    ORDER BY good_repute_form_key, created_at DESC
) gr
WHERE gr.status <> 'deleted'

UNION ALL
-- ── tram_control_card (Transpordiameti kontrollkaart, standalone) ───────
SELECT
    'tram_control_card',
    tc.tram_control_card_key,
    NULL::bigint,
    tc.form_number,
    tc.status,
    tc.control_date,
    tc.county,
    tc.vehicle_reg_nr,
    tc.company_reg_code,
    tc.company_name,
    (SELECT lower(string_agg(
        concat_ws(' ', d->>'personalCodeEe', d->>'personalCodeForeign',
                       d->>'firstName', d->>'lastName'), ' '))
     FROM jsonb_array_elements(tc.drivers) AS d),
    tc.inspector_organisation_id,
    concat_ws(' ', tc.inspector_first_name, tc.inspector_last_name),
    (tc.result_type NOT IN ('ok', 'KORRAS', 'HOIATUS') OR tc.additional_measure IS NOT NULL),
    tc.created_at,
    tc.created_by,
    NULL::text,
    NULL::text
FROM (
    SELECT DISTINCT ON (tram_control_card_key) *
    FROM forms.tram_control_card
    ORDER BY tram_control_card_key, created_at DESC
) tc
WHERE tc.status <> 'deleted'

UNION ALL
-- ── sp_driver (sõidu- ja puhkeaeg, juht) — sub-form, ainult PPA ─────────
SELECT
    'sp_driver',
    sd.sp_driver_form_key,
    cf.compound_form_key,
    sd.sub_form_number,
    sd.status,
    cf.control_date,
    cf.county,
    cf.vehicle_reg_nr,
    cf.company_reg_code,
    cf.company_name,
    (SELECT lower(string_agg(
        concat_ws(' ', d->>'personal_code_ee', d->>'personal_code_foreign',
                       d->>'first_name', d->>'last_name'), ' '))
     FROM jsonb_array_elements(cf.drivers) AS d),
    cf.inspector_organisation_id,
    concat_ws(' ', cf.inspector_first_name, cf.inspector_last_name),
    (sd.result_type NOT IN ('ok', 'KORRAS', 'HOIATUS') OR sd.additional_measure IS NOT NULL),
    sd.created_at,
    sd.created_by,
    NULL::text,
    NULL::text
FROM lsd sd
JOIN compound_valid cf ON cf.compound_form_key = sd.compound_form_key
WHERE sd.status <> 'deleted'

UNION ALL
-- ── sp_teammate (sõidu- ja puhkeaeg, kaassõitja) — sub-form ─────────────
SELECT
    'sp_teammate',
    st.sp_teammate_form_key,
    cf.compound_form_key,
    st.sub_form_number,
    st.status,
    cf.control_date,
    cf.county,
    cf.vehicle_reg_nr,
    cf.company_reg_code,
    cf.company_name,
    (SELECT lower(string_agg(
        concat_ws(' ', d->>'personal_code_ee', d->>'personal_code_foreign',
                       d->>'first_name', d->>'last_name'), ' '))
     FROM jsonb_array_elements(cf.drivers) AS d),
    cf.inspector_organisation_id,
    concat_ws(' ', cf.inspector_first_name, cf.inspector_last_name),
    (st.result_type NOT IN ('ok', 'KORRAS', 'HOIATUS') OR st.additional_measure IS NOT NULL),
    st.created_at,
    st.created_by,
    NULL::text,
    NULL::text
FROM lst st
JOIN compound_valid cf ON cf.compound_form_key = st.compound_form_key
WHERE st.status <> 'deleted'

UNION ALL
-- ── vehicle_technical (tehnonõuetele vastavus, mootorsõiduk) — sub-form ──
SELECT
    'vehicle_technical',
    vt.vehicle_technical_form_key,
    cf.compound_form_key,
    vt.sub_form_number,
    vt.status,
    cf.control_date,
    cf.county,
    cf.vehicle_reg_nr,
    cf.company_reg_code,
    cf.company_name,
    (SELECT lower(string_agg(
        concat_ws(' ', d->>'personal_code_ee', d->>'personal_code_foreign',
                       d->>'first_name', d->>'last_name'), ' '))
     FROM jsonb_array_elements(cf.drivers) AS d),
    cf.inspector_organisation_id,
    concat_ws(' ', cf.inspector_first_name, cf.inspector_last_name),
    (vt.result_type <> 'ok'),
    vt.created_at,
    vt.created_by,
    NULL::text,
    NULL::text
FROM lvt vt
JOIN compound_valid cf ON cf.compound_form_key = vt.compound_form_key
WHERE vt.status <> 'deleted'

UNION ALL
-- ── trailer_technical (tehnonõuetele vastavus, haagis) — sub-form ───────
SELECT
    'trailer_technical',
    tt.trailer_technical_form_key,
    cf.compound_form_key,
    tt.sub_form_number,
    tt.status,
    cf.control_date,
    cf.county,
    cf.vehicle_reg_nr,
    cf.company_reg_code,
    cf.company_name,
    (SELECT lower(string_agg(
        concat_ws(' ', d->>'personal_code_ee', d->>'personal_code_foreign',
                       d->>'first_name', d->>'last_name'), ' '))
     FROM jsonb_array_elements(cf.drivers) AS d),
    cf.inspector_organisation_id,
    concat_ws(' ', cf.inspector_first_name, cf.inspector_last_name),
    (tt.result_type <> 'ok'),
    tt.created_at,
    tt.created_by,
    NULL::text,
    NULL::text
FROM ltt tt
JOIN compound_valid cf ON cf.compound_form_key = tt.compound_form_key
WHERE tt.status <> 'deleted'

UNION ALL
-- ── adr (ohtlik veos) — sub-form ────────────────────────────────────────
SELECT
    'adr',
    ad.adr_form_key,
    cf.compound_form_key,
    ad.sub_form_number,
    ad.status,
    cf.control_date,
    cf.county,
    cf.vehicle_reg_nr,
    cf.company_reg_code,
    cf.company_name,
    (SELECT lower(string_agg(
        concat_ws(' ', d->>'personal_code_ee', d->>'personal_code_foreign',
                       d->>'first_name', d->>'last_name'), ' '))
     FROM jsonb_array_elements(cf.drivers) AS d),
    cf.inspector_organisation_id,
    concat_ws(' ', cf.inspector_first_name, cf.inspector_last_name),
    (ad.result_type <> 'ok'),
    ad.created_at,
    ad.created_by,
    NULL::text,
    NULL::text
FROM ladr ad
JOIN compound_valid cf ON cf.compound_form_key = ad.compound_form_key
WHERE ad.status <> 'deleted'

UNION ALL
-- ── kv (autoveo katkestamine) — sub-form ────────────────────────────────
SELECT
    'kv',
    kv.kv_form_key,
    cf.compound_form_key,
    kv.sub_form_number,
    kv.status,
    cf.control_date,
    cf.county,
    cf.vehicle_reg_nr,
    cf.company_reg_code,
    cf.company_name,
    (SELECT lower(string_agg(
        concat_ws(' ', d->>'personal_code_ee', d->>'personal_code_foreign',
                       d->>'first_name', d->>'last_name'), ' '))
     FROM jsonb_array_elements(cf.drivers) AS d),
    cf.inspector_organisation_id,
    concat_ws(' ', cf.inspector_first_name, cf.inspector_last_name),
    false,
    kv.created_at,
    kv.created_by,
    NULL::text,
    NULL::text
FROM lkv kv
JOIN compound_valid cf ON cf.compound_form_key = kv.compound_form_key
WHERE kv.status <> 'deleted';

COMMENT ON VIEW forms.form_search IS 'LJVIS2-9 cross-entity form search. One row per latest, non-deleted snapshot of each form type (compound + sub-forms are PPA-only; foreign_violation, labour_inspection, good_repute, tram_control_card are standalone). Sub-form business fields inherited from latest non-deleted parent compound_form. Backing view for RESQL control-forms/search/search. tram_control_card added 20261112 (ADR-002, replaces tram_compound/tram_driver).';
