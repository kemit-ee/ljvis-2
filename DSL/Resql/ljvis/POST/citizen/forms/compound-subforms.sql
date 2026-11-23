/*
description: Citizen-facing read-only list of every published sub-form (sp_driver, sp_teammate, vehicle_technical,
  trailer_technical, adr, kv) attached to a compound_form (koondvorm), for the citizen compound-form detail
  page. Companion to citizen/forms/compound.sql's parent-row fetch - the detail page was showing only
  the koondvorm's general/company/drivers sections and silently hiding all sub-forms, even when they existed
  and were published. Ownership/publish-status of the PARENT koondvorm is checked by the calling Ruuter
  DSL (same as compound.yml) before this query runs; this query itself only takes compound_form_key and
  only ever returns sub-forms with status='published' (unpublished sub-forms are hidden from citizens
  even if the parent koondvorm is already published - same principle as citizen/forms/search.sql). Latest
  snapshot per sub-form is picked via DISTINCT ON. Violations are unified into one JSONB array per row
  of the shape {code, severity (MSI|VSI|SI|MI), description, regulation, article} so the frontend can render every
  sub-form type generically. Every violation that has a severity is included: the 5 regulation arrays, cabotage,
  document checks and mass/length/width of sp_driver/sp_teammate, vehicle/trailer technical codes (plain strings or
  objects) and ADR records with a carrier-responsible (C) EU infringement code. Entries explicitly marked
  isDetected=false are left out. Descriptions come from the saved entry or, failing that, from the latest
  EU_INFRINGEMENT / cabotage classifier snapshot (retired codes still resolve). enforcement_decision is returned
  for the 'Karistuse määramise alus' row.
namespace: citizen
params:
  compound_form_key:
    type: number
    required: false
returns:
- name: form_type
  type: string
  nullable: true
- name: form_key
  type: number
  nullable: true
- name: sub_form_number
  type: string
  nullable: true
- name: status
  type: string
  nullable: true
- name: result_type
  type: string
  nullable: true
- name: violations
  type: string
  nullable: true
- name: notes
  type: string
  nullable: true
- name: enforcement_decision
  type: string
  nullable: true
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
),
sp AS (
    SELECT 'sp_driver'::text AS ft, sp_driver_form_key AS fk, violations_561_2006 v561, violations_165_2014 v165,
           violations_2002_15 v2002, violations_593_2008 v593, violations_2020_1057 v2020,
           cabotage_violations cab, document_checks docs, mass_dimension_measurements mass, status
      FROM lsd
    UNION ALL
    SELECT 'sp_teammate', sp_teammate_form_key, violations_561_2006, violations_165_2014,
           violations_2002_15, violations_593_2008, violations_2020_1057,
           cabotage_violations, document_checks, mass_dimension_measurements, status
      FROM lst
),
raw AS (
    SELECT ft, fk, '561/2006' AS reg, e, 'sp' AS kind FROM sp, jsonb_array_elements(COALESCE(v561, '[]'::jsonb)) e WHERE status = 'published'
    UNION ALL SELECT ft, fk, '165/2014', e, 'sp' FROM sp, jsonb_array_elements(COALESCE(v165, '[]'::jsonb)) e WHERE status = 'published'
    UNION ALL SELECT ft, fk, '2002/15', e, 'sp' FROM sp, jsonb_array_elements(COALESCE(v2002, '[]'::jsonb)) e WHERE status = 'published'
    UNION ALL SELECT ft, fk, '593/2008', e, 'sp' FROM sp, jsonb_array_elements(COALESCE(v593, '[]'::jsonb)) e WHERE status = 'published'
    UNION ALL SELECT ft, fk, '2020/1057', e, 'sp' FROM sp, jsonb_array_elements(COALESCE(v2020, '[]'::jsonb)) e WHERE status = 'published'
    UNION ALL SELECT ft, fk, NULL, e, 'sp' FROM sp, jsonb_array_elements(COALESCE(cab, '[]'::jsonb)) e WHERE status = 'published'
    UNION ALL SELECT ft, fk, NULL, e, 'doc' FROM sp, jsonb_array_elements(COALESCE(docs, '[]'::jsonb)) e WHERE status = 'published'
    UNION ALL SELECT ft, fk, NULL, e, 'mass' FROM sp, jsonb_array_elements(COALESCE(mass, '[]'::jsonb)) e WHERE status = 'published'
    UNION ALL
    SELECT 'vehicle_technical', vt.vehicle_technical_form_key, NULL,
           CASE WHEN jsonb_typeof(e) = 'string' THEN jsonb_build_object('violationCode', e #>> '{}') ELSE e END, 'tech'
      FROM lvt vt, jsonb_array_elements(COALESCE(vt.violations, '[]'::jsonb)) e WHERE vt.status = 'published'
    UNION ALL
    SELECT 'trailer_technical', tt.trailer_technical_form_key, NULL,
           CASE WHEN jsonb_typeof(e) = 'string' THEN jsonb_build_object('violationCode', e #>> '{}') ELSE e END, 'tech'
      FROM ltt tt, jsonb_array_elements(COALESCE(tt.violations, '[]'::jsonb)) e WHERE tt.status = 'published'
    UNION ALL
    -- ADR: ainult vedaja (C) vastutusel olevad kirjed, mille EU rikkumise kood on olemas (NONE/tühi jäetakse välja).
    SELECT 'adr', ad.adr_form_key, NULL,
           jsonb_build_object(
               'violationCode', regexp_replace(rec ->> 'reg2016403Code', '\s', '', 'g'),
               'severityCode', rec ->> 'reg2016403Severity',
               'adrReference', rec ->> 'adrReference'),
           'adr'
      FROM ladr ad,
           jsonb_array_elements(COALESCE(ad.infringements, '[]'::jsonb) || COALESCE(ad.other_infringements, '[]'::jsonb)) inf,
           jsonb_array_elements(COALESCE(inf -> 'records', '[]'::jsonb)) rec
     WHERE ad.status = 'published'
       AND inf ->> 'inspectionStatus' = 'NC'
       AND COALESCE(inf ->> 'infringementDetected', 'true') <> 'false'
       AND COALESCE(rec -> 'responsibleParticipants', '[]'::jsonb) ? 'C'
       AND COALESCE(rec ->> 'reg2016403Code', 'NONE') NOT IN ('', 'NONE')
),
norm AS (
    SELECT r.ft, r.fk, r.reg, r.kind, r.e,
           COALESCE(NULLIF(r.e ->> 'violationCode', ''), NULLIF(r.e ->> 'violation_code', ''),
                    NULLIF(r.e ->> 'level3Code', ''), NULLIF(r.e ->> 'code', '')) AS code
      FROM raw r
     WHERE COALESCE(r.e ->> 'isDetected', 'true') <> 'false'
),
sev AS (
    SELECT n.*,
           COALESCE(
               (SELECT UPPER(x) FROM unnest(ARRAY[n.e ->> 'severityCode', n.e ->> 'severity_code', n.e ->> 'severity']) x
                 WHERE UPPER(x) IN ('MSI', 'VSI', 'SI', 'MI') LIMIT 1),
               substring(n.code FROM '^(MSI|VSI|SI|MI)[0-9]')) AS severity
      FROM norm n
),
described AS (
    SELECT s.ft, s.fk, s.reg, s.severity, s.code, s.kind, s.e,
           cls.name AS cls_name
      FROM sev s
      LEFT JOIN LATERAL (
          SELECT cv.name
            FROM classifier.classifier_value cv
            JOIN classifier.classifier c ON c.classifier_key = cv.classifier_key
           WHERE cv.code = s.code
             AND c.code IN ('EU_INFRINGEMENT', 'CARGO_CABOTAGE_VIOLATION', 'PASSENGER_CABOTAGE_VIOLATION')
           ORDER BY cv.created_at DESC
           LIMIT 1
      ) cls ON TRUE
     WHERE s.severity IS NOT NULL
),
viol AS (
    SELECT d.ft, d.fk,
           jsonb_agg(jsonb_build_object(
               'code', d.code,
               'severity', d.severity,
               'description', CASE d.kind
                   WHEN 'mass' THEN NULLIF(concat_ws(' – ', NULLIF(d.e ->> 'level1Name', ''), NULLIF(d.e ->> 'level3Name', '')), '')
                   ELSE COALESCE(NULLIF(d.e ->> 'level2Name', ''), d.cls_name, NULLIF(d.e ->> 'description', ''))
               END,
               'regulation', d.reg,
               'article', COALESCE(NULLIF(d.e ->> 'level2Description', ''), NULLIF(d.e ->> 'adrReference', ''))
           ) ORDER BY d.kind, d.code) AS items
      FROM described d
     GROUP BY d.ft, d.fk
)

-- ── sp_driver: 5 separate EU-regulation violation arrays → 1 unified array ──
SELECT
    'sp_driver'::text AS form_type,
    sd.sp_driver_form_key AS form_key,
    sd.sub_form_number,
    sd.status,
    sd.result_type,
    COALESCE((SELECT items FROM viol WHERE viol.ft = 'sp_driver' AND viol.fk = sd.sp_driver_form_key), '[]'::jsonb)::text AS violations,
    sd.notes,
    sd.enforcement_decision
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
    COALESCE((SELECT items FROM viol WHERE viol.ft = 'sp_teammate' AND viol.fk = st.sp_teammate_form_key), '[]'::jsonb)::text,
    st.notes,
    st.enforcement_decision
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
    COALESCE((SELECT items FROM viol WHERE viol.ft = 'vehicle_technical' AND viol.fk = vt.vehicle_technical_form_key), '[]'::jsonb)::text,
    vt.notes,
    vt.enforcement_decision
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
    COALESCE((SELECT items FROM viol WHERE viol.ft = 'trailer_technical' AND viol.fk = tt.trailer_technical_form_key), '[]'::jsonb)::text,
    tt.notes,
    tt.enforcement_decision
FROM ltt tt
WHERE tt.status = 'published'

UNION ALL
-- ── adr: only NC records the carrier is responsible for, with an EU infringement code ──
SELECT
    'adr'::text,
    ad.adr_form_key,
    ad.sub_form_number,
    ad.status,
    ad.result_type,
    COALESCE((SELECT items FROM viol WHERE viol.ft = 'adr' AND viol.fk = ad.adr_form_key), '[]'::jsonb)::text,
    ad.notes,
    ad.enforcement_decision
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
    kv.interruption_reason,
    NULL::text
FROM lkv kv
WHERE kv.status = 'published'

ORDER BY form_type, form_key;
