/*
declaration:
  version: 0.1
  description: >-
    LJVIS2-37 officer dashboard aggregate. Returns unfinished (not fully
    published) koondvorm cases with their active sub-forms, unfinished
    standalone forms and a "needs attention" list (deadline / confirmed-not-
    published) — all scoped to either the caller's own work (scope=own,
    created_by = :actor_code) or the caller's whole organisation
    (scope=organisation, inspector_organisation_id / org-scoped standalone
    forms = :actor_org_id). Deadline rule (LJVIS2-37 AC): expedited
    (kiirmenetlus) = +15 days from the first snapshot where proceeding_type
    became 'expedited'; general (üldmenetlus) = +45 days from the koondvorm's
    control_date. Mirrors the CTE shape of forms.form_search
    (20260831120000) without touching that shared view.
  method: post
  namespace: dashboard
  allowlist:
    body:
      - field: scope
        type: string
        description: "'own' or 'organisation'"
      - field: actor_code
        type: string
        description: "auth_user.personalcode of the caller"
      - field: actor_org_id
        type: string
        description: "auth_user.organisationid of the caller"
  response:
    fields:
      - field: section
        type: string
      - field: payload
        type: string
*/
WITH lc AS (
    SELECT DISTINCT ON (compound_form_key) *
    FROM forms.compound_form
    ORDER BY compound_form_key, created_at DESC
),
compound_valid AS (
    SELECT * FROM lc WHERE status <> 'deleted'
),
compound_scoped AS (
    SELECT * FROM compound_valid cf
    WHERE (:scope = 'organisation' AND cf.inspector_organisation_id = :actor_org_id)
       OR (:scope <> 'organisation' AND cf.created_by = :actor_code)
),
-- latest snapshot per sub-form, across all six sub-form tables, tagged with type
lsd AS (
    SELECT DISTINCT ON (sp_driver_form_key) *
    FROM forms.sp_driver_form ORDER BY sp_driver_form_key, created_at DESC
),
lst AS (
    SELECT DISTINCT ON (sp_teammate_form_key) *
    FROM forms.sp_teammate_form ORDER BY sp_teammate_form_key, created_at DESC
),
lvt AS (
    SELECT DISTINCT ON (vehicle_technical_form_key) *
    FROM forms.vehicle_technical_form ORDER BY vehicle_technical_form_key, created_at DESC
),
ltt AS (
    SELECT DISTINCT ON (trailer_technical_form_key) *
    FROM forms.trailer_technical_form ORDER BY trailer_technical_form_key, created_at DESC
),
ladr AS (
    SELECT DISTINCT ON (adr_form_key) *
    FROM forms.adr_form ORDER BY adr_form_key, created_at DESC
),
lkv AS (
    SELECT DISTINCT ON (kv_form_key) *
    FROM forms.kv_form ORDER BY kv_form_key, created_at DESC
),
-- earliest snapshot per sub-form where proceeding_type first became non-'none'/non-null —
-- used as the "väärteomenetlus alustatud" date for the 15-day expedited deadline.
proceeding_started AS (
    SELECT sp_driver_form_key AS sub_form_key, 'sp_driver'::text AS form_type, MIN(created_at) AS started_at
    FROM forms.sp_driver_form WHERE proceeding_type = 'expedited' GROUP BY sp_driver_form_key
    UNION ALL
    SELECT sp_teammate_form_key, 'sp_teammate', MIN(created_at)
    FROM forms.sp_teammate_form WHERE proceeding_type = 'expedited' GROUP BY sp_teammate_form_key
    UNION ALL
    SELECT vehicle_technical_form_key, 'vehicle_technical', MIN(created_at)
    FROM forms.vehicle_technical_form WHERE proceeding_type = 'expedited' GROUP BY vehicle_technical_form_key
    UNION ALL
    SELECT trailer_technical_form_key, 'trailer_technical', MIN(created_at)
    FROM forms.trailer_technical_form WHERE proceeding_type = 'expedited' GROUP BY trailer_technical_form_key
    UNION ALL
    SELECT adr_form_key, 'adr', MIN(created_at)
    FROM forms.adr_form WHERE proceeding_type = 'expedited' GROUP BY adr_form_key
),
sub_union AS (
    SELECT 'sp_driver'::text AS form_type, sd.sp_driver_form_key AS form_key, sd.compound_form_key,
           sd.sub_form_number AS form_number, sd.status, sd.proceeding_type, sd.created_at, sd.created_by
    FROM lsd sd WHERE sd.status <> 'deleted'
    UNION ALL
    SELECT 'sp_teammate', st.sp_teammate_form_key, st.compound_form_key,
           st.sub_form_number, st.status, st.proceeding_type, st.created_at, st.created_by
    FROM lst st WHERE st.status <> 'deleted'
    UNION ALL
    SELECT 'vehicle_technical', vt.vehicle_technical_form_key, vt.compound_form_key,
           vt.sub_form_number, vt.status, vt.proceeding_type, vt.created_at, vt.created_by
    FROM lvt vt WHERE vt.status <> 'deleted'
    UNION ALL
    SELECT 'trailer_technical', tt.trailer_technical_form_key, tt.compound_form_key,
           tt.sub_form_number, tt.status, tt.proceeding_type, tt.created_at, tt.created_by
    FROM ltt tt WHERE tt.status <> 'deleted'
    UNION ALL
    SELECT 'adr', ad.adr_form_key, ad.compound_form_key,
           ad.sub_form_number, ad.status, ad.proceeding_type, ad.created_at, ad.created_by
    FROM ladr ad WHERE ad.status <> 'deleted'
    UNION ALL
    SELECT 'kv', kv.kv_form_key, kv.compound_form_key,
           kv.sub_form_number, kv.status, NULL::varchar, kv.created_at, kv.created_by
    FROM lkv kv WHERE kv.status <> 'deleted'
),
sub_scoped AS (
    SELECT su.*, ps.started_at AS proceeding_started_at
    FROM sub_union su
    JOIN compound_scoped cf ON cf.compound_form_key = su.compound_form_key
    LEFT JOIN proceeding_started ps
           ON ps.sub_form_key = su.form_key AND ps.form_type = su.form_type
),
compound_progress AS (
    SELECT
        cf.compound_form_key,
        cf.form_number,
        cf.status,
        cf.control_date,
        cf.control_time,
        cf.vehicle_reg_nr,
        cf.company_name,
        concat_ws(' ', cf.inspector_first_name, cf.inspector_last_name) AS inspector_name,
        (SELECT string_agg(concat_ws(' ', d->>'first_name', d->>'last_name'), ', ')
         FROM jsonb_array_elements(cf.drivers) AS d) AS driver_name,
        cf.created_by,
        COALESCE(
            (SELECT jsonb_agg(jsonb_build_object(
                'formType', su.form_type,
                'formKey', su.form_key,
                'formNumber', su.form_number,
                'status', su.status,
                'proceedingType', su.proceeding_type
             ) ORDER BY su.form_type, su.form_key)
             FROM sub_scoped su WHERE su.compound_form_key = cf.compound_form_key),
            '[]'::jsonb
        ) AS sub_forms,
        NOT EXISTS (
            SELECT 1 FROM sub_scoped su
            WHERE su.compound_form_key = cf.compound_form_key AND su.status <> 'published'
        ) AND EXISTS (
            SELECT 1 FROM sub_scoped su WHERE su.compound_form_key = cf.compound_form_key
        ) AS all_published
    FROM compound_scoped cf
),
-- ── section 1: unfinished koondvorm cases (not every active sub-form published yet) ──
active_compound AS (
    SELECT jsonb_build_object(
        'compoundFormKey', compound_form_key,
        'formNumber', form_number,
        'status', status,
        'controlDate', control_date,
        'controlTime', control_time,
        'vehicleRegNr', vehicle_reg_nr,
        'companyName', company_name,
        'inspectorName', inspector_name,
        'driverName', driver_name,
        'subForms', sub_forms
    ) AS item,
    control_date AS sort_key
    FROM compound_progress
    WHERE status <> 'published' OR all_published = false
),
-- ── section 2: unfinished standalone forms (saved/confirmed) ───────────────
-- mainTime/vehicleRegNr: only foreign_violation_form actually captures an
-- inspection time-of-day and a vehicle reg nr; labour_inspection/good_repute
-- have neither concept, so they report NULL (rendered as "—" on the FE).
standalone_union AS (
    SELECT 'foreign_violation'::text AS form_type, fv.foreign_violation_form_key AS form_key,
           fv.form_number, fv.status, fv.inspection_date AS main_date,
           fv.inspection_time AS main_time, fv.vehicle_reg_nr, fv.created_at, fv.created_by
    FROM (SELECT DISTINCT ON (foreign_violation_form_key) * FROM forms.foreign_violation_form
          ORDER BY foreign_violation_form_key, created_at DESC) fv
    WHERE fv.status NOT IN ('deleted','published')
      AND ((:scope = 'organisation' AND fv.inspector_organisation_id = :actor_org_id)
           OR (:scope <> 'organisation' AND fv.created_by = :actor_code))
    UNION ALL
    SELECT 'labour_inspection', li.labour_inspection_form_key,
           li.form_number, li.status, li.inspection_date,
           NULL::time, NULL::varchar, li.created_at, li.created_by
    FROM (SELECT DISTINCT ON (labour_inspection_form_key) * FROM forms.labour_inspection_form
          ORDER BY labour_inspection_form_key, created_at DESC) li
    WHERE li.status NOT IN ('deleted','published')
      AND (:scope <> 'organisation' AND li.created_by = :actor_code OR :scope = 'organisation')
    UNION ALL
    SELECT 'good_repute', gr.good_repute_form_key,
           gr.form_number, gr.status, gr.certificate_issue_date,
           NULL::time, NULL::varchar, gr.created_at, gr.created_by
    FROM (SELECT DISTINCT ON (good_repute_form_key) * FROM forms.good_repute_form
          ORDER BY good_repute_form_key, created_at DESC) gr
    WHERE gr.status NOT IN ('deleted','published')
      AND (:scope <> 'organisation' AND gr.created_by = :actor_code OR :scope = 'organisation')
),
active_standalone AS (
    SELECT jsonb_build_object(
        'formType', form_type, 'formKey', form_key, 'formNumber', form_number,
        'status', status, 'mainDate', main_date, 'mainTime', main_time, 'vehicleRegNr', vehicle_reg_nr
    ) AS item,
    main_date AS sort_key
    FROM standalone_union
),
-- ── section 3: needs attention (deadline overdue/soon, or confirmed-not-published) ──
deadline_candidates AS (
    SELECT
        cp.compound_form_key, cp.form_number, sf->>'formType' AS form_type,
        (sf->>'formKey')::bigint AS form_key, sf->>'formNumber' AS sub_form_number,
        sf->>'proceedingType' AS proceeding_type,
        CASE
            WHEN sf->>'proceedingType' = 'expedited' THEN
                (SELECT ps.started_at FROM proceeding_started ps
                 WHERE ps.sub_form_key = (sf->>'formKey')::bigint AND ps.form_type = sf->>'formType') + INTERVAL '15 days'
            WHEN sf->>'proceedingType' = 'general' THEN
                cp.control_date + INTERVAL '45 days'
            ELSE NULL
        END AS deadline_at
    FROM compound_progress cp,
         LATERAL jsonb_array_elements(cp.sub_forms) sf
    WHERE sf->>'proceedingType' IN ('expedited', 'general')
),
needs_attention AS (
    SELECT jsonb_build_object(
        'compoundFormKey', compound_form_key,
        'formNumber', form_number,
        'formType', form_type,
        'formKey', form_key,
        'subFormNumber', sub_form_number,
        'proceedingType', proceeding_type,
        'deadlineAt', deadline_at,
        'reason', CASE WHEN deadline_at < now() THEN 'overdue' ELSE 'upcoming' END
    ) AS item,
    deadline_at AS sort_key
    FROM deadline_candidates
    WHERE deadline_at IS NOT NULL
      AND deadline_at < now() + INTERVAL '3 days'
)
SELECT 'activeCompoundForms' AS section, COALESCE(jsonb_agg(item ORDER BY sort_key DESC), '[]'::jsonb)::text AS payload FROM active_compound
UNION ALL
SELECT 'activeStandaloneForms', COALESCE(jsonb_agg(item ORDER BY sort_key DESC), '[]'::jsonb)::text FROM active_standalone
UNION ALL
SELECT 'needsAttention', COALESCE(jsonb_agg(item ORDER BY sort_key ASC), '[]'::jsonb)::text FROM needs_attention;
