/*
description: Per-control MSI/VSI/SI/MI severity breakdown + weightedPoints for one company's controls,
  letting a citizen see WHY their company's risk score is what it is (not just the aggregate number).
  Uses the same rolling window definition as calculate_risk_score.sql/recalculate.yml (caller passes window_start/window_end
  explicitly — Ruuter.internal controls.yml uses "now - 2 years" .. "now", matching the persisted aggregate
  score's window so the two stay comparable). Shares the exact qualifying_forms/violation_counts/sp_form_category
  CTE logic as calculate_risk_score.sql — kept as a separate query rather than reusing that one's output
  because this returns one row PER CONTROL (compound_form_key) instead of one aggregated row. Display
  fields (form_number/main_date/vehicle_reg_nr) come from forms.form_search rather than forms.compound_form
  directly, to reuse its existing "latest non-deleted snapshot" projection instead of duplicating a DISTINCT
  ON.
namespace: risk_score
params:
  company_reg_code:
    type: string
    required: false
  window_start:
    type: string
    required: false
  window_end:
    type: string
    required: false
returns:
- name: compound_form_key
  type: number
  nullable: true
- name: form_number
  type: string
  nullable: true
- name: main_date
  type: string
  nullable: true
- name: vehicle_reg_nr
  type: string
  nullable: true
- name: is_fully_excluded
  type: boolean
  nullable: true
- name: n_msi
  type: number
  nullable: true
- name: n_vsi
  type: number
  nullable: true
- name: n_si
  type: number
  nullable: true
- name: n_mi
  type: number
  nullable: true
- name: weighted_points
  type: number
  nullable: true
*/
WITH enforcement_dates AS (
  SELECT compound_form_key, MIN(created_at) AS enforcement_date
  FROM forms.compound_form
  WHERE company_reg_code = :company_reg_code
    AND status = 'published'
    -- Kustutatud koondvorm (viimane versioon status='deleted') ei loe.
    AND compound_form_key NOT IN (
      SELECT l.compound_form_key
      FROM (
        SELECT DISTINCT ON (compound_form_key) compound_form_key, status
        FROM forms.compound_form
        WHERE company_reg_code = :company_reg_code
        ORDER BY compound_form_key, created_at DESC
      ) l
      WHERE l.status = 'deleted'
    )
  GROUP BY compound_form_key
),
qualifying_forms AS (
  SELECT ed.compound_form_key, ed.enforcement_date
  FROM enforcement_dates ed
  WHERE :company_reg_code ~ '^[0-9]{8}$'
    AND ed.enforcement_date >= :window_start::DATE
    AND ed.enforcement_date <= (:window_end::DATE + INTERVAL '1 day')
),
sp_driver_latest AS (
  SELECT DISTINCT ON (sp_driver_form_key)
    sp_driver_form_key AS sp_form_key, compound_form_key, status AS latest_status, selection_status, sp_applicability, result_type, proceeding_type,
    violations_561_2006, violations_165_2014, violations_2002_15, violations_593_2008, violations_2020_1057,
    document_checks, cabotage_violations
  FROM forms.sp_driver_form
  WHERE compound_form_key IN (SELECT compound_form_key FROM qualifying_forms)
    AND status IN ('published', 'deleted')
  ORDER BY sp_driver_form_key, created_at DESC
),
sp_driver_active AS (
  SELECT * FROM sp_driver_latest
  WHERE latest_status = 'published'
    AND (selection_status IS NULL OR selection_status = 'active')
),
sp_teammate_latest AS (
  SELECT DISTINCT ON (sp_teammate_form_key)
    sp_teammate_form_key AS sp_form_key, compound_form_key, status AS latest_status, selection_status, sp_applicability, result_type, proceeding_type,
    violations_561_2006, violations_165_2014, violations_2002_15, violations_593_2008, violations_2020_1057,
    document_checks, cabotage_violations
  FROM forms.sp_teammate_form
  WHERE compound_form_key IN (SELECT compound_form_key FROM qualifying_forms)
    AND status IN ('published', 'deleted')
  ORDER BY sp_teammate_form_key, created_at DESC
),
sp_teammate_active AS (
  SELECT * FROM sp_teammate_latest
  WHERE latest_status = 'published'
    AND (selection_status IS NULL OR selection_status = 'active')
),
all_sp_forms AS (
  SELECT sp_form_key, compound_form_key, sp_applicability, result_type, proceeding_type,
    violations_561_2006, violations_165_2014, violations_2002_15, violations_593_2008, violations_2020_1057,
    document_checks, cabotage_violations
  FROM sp_driver_active
  UNION ALL
  SELECT sp_form_key, compound_form_key, sp_applicability, result_type, proceeding_type,
    violations_561_2006, violations_165_2014, violations_2002_15, violations_593_2008, violations_2020_1057,
    document_checks, cabotage_violations
  FROM sp_teammate_active
),
violation_counts AS (
  -- ühe SP-vormi raskuskoodid massiivina (alampäring, mitte LATERAL JOIN); loendur allpool
  SELECT
    f.sp_form_key,
    f.compound_form_key,
    f.sp_applicability,
    f.result_type,
    f.proceeding_type,
    ARRAY(
      SELECT elem->>'severityCode'
      FROM jsonb_array_elements(
             COALESCE(f.violations_561_2006, '[]'::jsonb)
             || COALESCE(f.violations_165_2014, '[]'::jsonb)
             || COALESCE(f.violations_2002_15, '[]'::jsonb)
             || COALESCE(f.violations_593_2008, '[]'::jsonb)
             || COALESCE(f.violations_2020_1057, '[]'::jsonb)
           ) elem
      WHERE (elem->>'isDetected') = 'true' OR elem->'isDetected' IS NULL
      UNION ALL
      SELECT elem->>'severityCode'
      FROM jsonb_array_elements(COALESCE(f.document_checks, '[]'::jsonb)) elem
      UNION ALL
      SELECT elem->>'severityCode'
      FROM jsonb_array_elements(COALESCE(f.cabotage_violations, '[]'::jsonb)) elem
    ) AS severity_codes
  FROM all_sp_forms f
),
violation_tallies AS (
  SELECT
    vc.sp_form_key,
    vc.compound_form_key,
    vc.sp_applicability,
    vc.result_type,
    vc.proceeding_type,
    (SELECT COUNT(*) FROM unnest(vc.severity_codes) c WHERE c = 'MSI') AS n_msi,
    (SELECT COUNT(*) FROM unnest(vc.severity_codes) c WHERE c = 'VSI') AS n_vsi,
    (SELECT COUNT(*) FROM unnest(vc.severity_codes) c WHERE c = 'SI')  AS n_si,
    (SELECT COUNT(*) FROM unnest(vc.severity_codes) c WHERE c = 'MI')  AS n_mi
  FROM violation_counts vc
),
sp_form_category AS (
  SELECT
    *,
    CASE
      WHEN sp_applicability IN ('EI_RAKENDATA', 'EI_KONTROLLITUD') AND result_type = 'KORRAS'
        THEN 'excluded'
      WHEN sp_applicability = 'RAKENDATAKSE' AND proceeding_type IN ('KIIR', 'YLD', 'LYHI')
           AND (n_msi + n_vsi + n_si + n_mi) = 0
        THEN 'zero_point'
      WHEN result_type = 'HOIATUS' AND sp_applicability = 'RAKENDATAKSE'
           AND (n_msi + n_vsi + n_si + n_mi) = 0
        THEN 'zero_point'
      ELSE 'counted'
    END AS category
  FROM violation_tallies
),
-- Per compound_form_key: severity counts and weighted points are summed only
-- over 'counted' SP forms — same convention as calculate_risk_score.sql's
-- weighted_sum, so the two numbers stay consistent for a given control.
-- Koondvormid ilma ühegi SP-alamvormita ilmuvad tulemusse ikkagi (per_control loeb sp_agg
-- alampäringuga ja vaikeväärtus on "täielikult välistatud", docs/risk-score/formula.md §3),
-- nii et nad ei kao kodaniku vaatest vaikselt.
sp_agg AS (
  SELECT
    sfc.compound_form_key,
    BOOL_AND(sfc.category = 'excluded') AS is_fully_excluded,
    COALESCE(SUM(CASE WHEN sfc.category = 'counted' THEN sfc.n_msi ELSE 0 END), 0) AS n_msi,
    COALESCE(SUM(CASE WHEN sfc.category = 'counted' THEN sfc.n_vsi ELSE 0 END), 0) AS n_vsi,
    COALESCE(SUM(CASE WHEN sfc.category = 'counted' THEN sfc.n_si  ELSE 0 END), 0) AS n_si,
    COALESCE(SUM(CASE WHEN sfc.category = 'counted' THEN sfc.n_mi  ELSE 0 END), 0) AS n_mi,
    COALESCE(SUM(CASE WHEN sfc.category = 'counted'
                       THEN sfc.n_msi * 90 + sfc.n_vsi * 30 + sfc.n_si * 10 + sfc.n_mi * 1
                       ELSE 0 END), 0) AS weighted_points
  FROM sp_form_category sfc
  GROUP BY sfc.compound_form_key
),
per_control AS (
  SELECT
    qf.compound_form_key,
    COALESCE((SELECT a.is_fully_excluded FROM sp_agg a WHERE a.compound_form_key = qf.compound_form_key), true) AS is_fully_excluded,
    COALESCE((SELECT a.n_msi FROM sp_agg a WHERE a.compound_form_key = qf.compound_form_key), 0) AS n_msi,
    COALESCE((SELECT a.n_vsi FROM sp_agg a WHERE a.compound_form_key = qf.compound_form_key), 0) AS n_vsi,
    COALESCE((SELECT a.n_si  FROM sp_agg a WHERE a.compound_form_key = qf.compound_form_key), 0) AS n_si,
    COALESCE((SELECT a.n_mi  FROM sp_agg a WHERE a.compound_form_key = qf.compound_form_key), 0) AS n_mi,
    COALESCE((SELECT a.weighted_points FROM sp_agg a WHERE a.compound_form_key = qf.compound_form_key), 0) AS weighted_points
  FROM qualifying_forms qf
),
controls AS (
  SELECT
    pc.compound_form_key,
    (SELECT fs.form_number FROM forms.form_search fs WHERE fs.form_type = 'compound' AND fs.form_key = pc.compound_form_key) AS form_number,
    (SELECT fs.main_date FROM forms.form_search fs WHERE fs.form_type = 'compound' AND fs.form_key = pc.compound_form_key) AS main_date,
    (SELECT fs.vehicle_reg_nr FROM forms.form_search fs WHERE fs.form_type = 'compound' AND fs.form_key = pc.compound_form_key) AS vehicle_reg_nr,
    pc.is_fully_excluded,
    pc.n_msi,
    pc.n_vsi,
    pc.n_si,
    pc.n_mi,
    pc.weighted_points
  FROM per_control pc
  WHERE EXISTS (SELECT 1 FROM forms.form_search fs WHERE fs.form_type = 'compound' AND fs.form_key = pc.compound_form_key)
)
SELECT compound_form_key, form_number, main_date, vehicle_reg_nr, is_fully_excluded, n_msi, n_vsi, n_si, n_mi, weighted_points
FROM controls
ORDER BY main_date DESC, compound_form_key DESC;
