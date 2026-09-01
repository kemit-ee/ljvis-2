/*
declaration:
  version: 0.1
  description: "Citizen-facing read-only list of every published sub-form (sp_driver, sp_teammate, vehicle_technical, trailer_technical, adr, kv) attached to a compound_form (koondvorm), for the citizen compound-form detail page. Companion to citizen/forms/compound.sql's parent-row fetch — the detail page was showing only the koondvorm's general/company/drivers sections and silently hiding all sub-forms, even when they existed and were published. Ownership/publish-status of the PARENT koondvorm is checked by the calling Ruuter DSL (same as compound.yml) before this query runs; this query itself only takes compound_form_key and only ever returns sub-forms with status='published' (unpublished sub-forms are hidden from citizens even if the parent koondvorm is already published — same principle as citizen/forms/search.sql). Latest snapshot per sub-form is picked via DISTINCT ON. Violations are unified into one JSONB array per row (regulation-tagged for sp_driver/sp_teammate, which otherwise carry 5 separate violation-array columns) so the frontend can render every sub-form type generically."
  method: post
  accepts: json
  returns: json
  namespace: citizen
  allowlist:
    body:
      - field: compound_form_key
        type: number
  response:
    fields:
      - field: form_type
        type: string
      - field: form_key
        type: number
      - field: sub_form_number
        type: string
      - field: status
        type: string
      - field: result_type
        type: string
      - field: violations
        type: string
      - field: notes
        type: string
*/
WITH lsd AS (
    SELECT DISTINCT ON (sp_driver_form_key) *
    FROM forms.sp_driver_form
    WHERE compound_form_key = :compound_form_key::BIGINT
    ORDER BY sp_driver_form_key, created_at DESC
),
lst AS (
    SELECT DISTINCT ON (sp_teammate_form_key) *
    FROM forms.sp_teammate_form
    WHERE compound_form_key = :compound_form_key::BIGINT
    ORDER BY sp_teammate_form_key, created_at DESC
),
lvt AS (
    SELECT DISTINCT ON (vehicle_technical_form_key) *
    FROM forms.vehicle_technical_form
    WHERE compound_form_key = :compound_form_key::BIGINT
    ORDER BY vehicle_technical_form_key, created_at DESC
),
ltt AS (
    SELECT DISTINCT ON (trailer_technical_form_key) *
    FROM forms.trailer_technical_form
    WHERE compound_form_key = :compound_form_key::BIGINT
    ORDER BY trailer_technical_form_key, created_at DESC
),
ladr AS (
    SELECT DISTINCT ON (adr_form_key) *
    FROM forms.adr_form
    WHERE compound_form_key = :compound_form_key::BIGINT
    ORDER BY adr_form_key, created_at DESC
),
lkv AS (
    SELECT DISTINCT ON (kv_form_key) *
    FROM forms.kv_form
    WHERE compound_form_key = :compound_form_key::BIGINT
    ORDER BY kv_form_key, created_at DESC
)
-- ── sp_driver: 5 separate EU-regulation violation arrays → 1 unified array ──
SELECT
    'sp_driver'::text AS form_type,
    sd.sp_driver_form_key AS form_key,
    sd.sub_form_number,
    sd.status,
    sd.result_type,
    (SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) FROM (
        SELECT e || jsonb_build_object('regulation', '561/2006') AS elem FROM jsonb_array_elements(sd.violations_561_2006) e
        UNION ALL
        SELECT e || jsonb_build_object('regulation', '165/2014') FROM jsonb_array_elements(sd.violations_165_2014) e
        UNION ALL
        SELECT e || jsonb_build_object('regulation', '2002/15') FROM jsonb_array_elements(sd.violations_2002_15) e
        UNION ALL
        SELECT e || jsonb_build_object('regulation', '593/2008') FROM jsonb_array_elements(sd.violations_593_2008) e
        UNION ALL
        SELECT e || jsonb_build_object('regulation', '2020/1057') FROM jsonb_array_elements(sd.violations_2020_1057) e
    ) t)::text AS violations,
    sd.notes
FROM lsd sd
WHERE sd.status = 'published'

UNION ALL
-- ── sp_teammate: same shape as sp_driver ──
SELECT
    'sp_teammate'::text,
    st.sp_teammate_form_key,
    st.sub_form_number,
    st.status,
    st.result_type,
    (SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) FROM (
        SELECT e || jsonb_build_object('regulation', '561/2006') AS elem FROM jsonb_array_elements(st.violations_561_2006) e
        UNION ALL
        SELECT e || jsonb_build_object('regulation', '165/2014') FROM jsonb_array_elements(st.violations_165_2014) e
        UNION ALL
        SELECT e || jsonb_build_object('regulation', '2002/15') FROM jsonb_array_elements(st.violations_2002_15) e
        UNION ALL
        SELECT e || jsonb_build_object('regulation', '593/2008') FROM jsonb_array_elements(st.violations_593_2008) e
        UNION ALL
        SELECT e || jsonb_build_object('regulation', '2020/1057') FROM jsonb_array_elements(st.violations_2020_1057) e
    ) t)::text,
    st.notes
FROM lst st
WHERE st.status = 'published'

UNION ALL
-- ── vehicle_technical: violations already a single JSONB array ──
SELECT
    'vehicle_technical'::text,
    vt.vehicle_technical_form_key,
    vt.sub_form_number,
    vt.status,
    vt.result_type,
    vt.violations::text,
    vt.notes
FROM lvt vt
WHERE vt.status = 'published'

UNION ALL
-- ── trailer_technical ──
SELECT
    'trailer_technical'::text,
    tt.trailer_technical_form_key,
    tt.sub_form_number,
    tt.status,
    tt.result_type,
    tt.violations::text,
    tt.notes
FROM ltt tt
WHERE tt.status = 'published'

UNION ALL
-- ── adr: "infringements" is its violations-equivalent column ──
SELECT
    'adr'::text,
    ad.adr_form_key,
    ad.sub_form_number,
    ad.status,
    ad.result_type,
    ad.infringements::text,
    ad.notes
FROM ladr ad
WHERE ad.status = 'published'

UNION ALL
-- ── kv: no result/violation concept (autoveo katkestamine is itself the outcome) ──
SELECT
    'kv'::text,
    kv.kv_form_key,
    kv.sub_form_number,
    kv.status,
    NULL::varchar,
    '[]'::text,
    kv.interruption_reason
FROM lkv kv
WHERE kv.status = 'published'

ORDER BY form_type, form_key;
