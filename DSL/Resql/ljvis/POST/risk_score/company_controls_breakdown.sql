/*
declaration:
  version: 0.1
  description: >-
    Per-control MSI/VSI/SI/MI severity breakdown + weightedPoints for one
    company's controls, letting a citizen see WHY their company's risk score
    is what it is (not just the aggregate number). Uses the same rolling
    window definition as calculate_risk_score.sql/recalculate.yml (caller
    passes window_start/window_end explicitly — Ruuter.internal controls.yml
    uses "now - 2 years" .. "now", matching the persisted aggregate score's
    window so the two stay comparable). Shares the exact
    qualifying_forms/violation_counts/sp_form_category CTE logic as
    calculate_risk_score.sql — kept as a separate query rather than reusing
    that one's output because this returns one row PER CONTROL
    (compound_form_key) instead of one aggregated row. Display fields
    (form_number/main_date/vehicle_reg_nr) come from forms.form_search
    rather than forms.compound_form directly, to reuse its existing "latest
    non-deleted snapshot" projection instead of duplicating a DISTINCT ON.
  method: post
  accepts: json
  returns: json
  namespace: risk_score
  allowlist:
    body:
      - field: company_reg_code
        type: string
      - field: window_start
        type: string
      - field: window_end
        type: string
  response:
    fields:
      - field: compound_form_key
        type: number
      - field: form_number
        type: string
      - field: main_date
        type: string
      - field: vehicle_reg_nr
        type: string
      - field: is_fully_excluded
        type: boolean
      - field: n_msi
        type: number
      - field: n_vsi
        type: number
      - field: n_si
        type: number
      - field: n_mi
        type: number
      - field: weighted_points
        type: number
*/
WITH enforcement_dates AS (
  SELECT compound_form_key, MIN(created_at) AS enforcement_date
  FROM forms.compound_form
  WHERE company_reg_code = :company_reg_code
    AND status = 'published'
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
    sp_driver_form_key AS sp_form_key, compound_form_key, sp_applicability, result_type, proceeding_type,
    violations_561_2006, violations_165_2014, violations_2002_15, violations_593_2008, violations_2020_1057,
    document_checks, cabotage_violations
  FROM forms.sp_driver_form
  WHERE compound_form_key IN (SELECT compound_form_key FROM qualifying_forms)
    AND (selection_status IS NULL OR selection_status = 'active')
  ORDER BY sp_driver_form_key, created_at DESC
),
sp_teammate_latest AS (
  SELECT DISTINCT ON (sp_teammate_form_key)
    sp_teammate_form_key AS sp_form_key, compound_form_key, sp_applicability, result_type, proceeding_type,
    violations_561_2006, violations_165_2014, violations_2002_15, violations_593_2008, violations_2020_1057,
    document_checks, cabotage_violations
  FROM forms.sp_teammate_form
  WHERE compound_form_key IN (SELECT compound_form_key FROM qualifying_forms)
    AND (selection_status IS NULL OR selection_status = 'active')
  ORDER BY sp_teammate_form_key, created_at DESC
),
all_sp_forms AS (
  SELECT * FROM sp_driver_latest
  UNION ALL
  SELECT * FROM sp_teammate_latest
),
violation_counts AS (
  SELECT
    f.sp_form_key,
    f.compound_form_key,
    f.sp_applicability,
    f.result_type,
    f.proceeding_type,
    COUNT(*) FILTER (WHERE v.severity_code = 'MSI') AS n_msi,
    COUNT(*) FILTER (WHERE v.severity_code = 'VSI') AS n_vsi,
    COUNT(*) FILTER (WHERE v.severity_code = 'SI')  AS n_si,
    COUNT(*) FILTER (WHERE v.severity_code = 'MI')  AS n_mi
  FROM all_sp_forms f
  LEFT JOIN LATERAL (
    SELECT elem->>'severityCode' AS severity_code
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
  ) v ON TRUE
  GROUP BY f.sp_form_key, f.compound_form_key, f.sp_applicability, f.result_type, f.proceeding_type
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
  FROM violation_counts
),
-- Per compound_form_key: severity counts and weighted points are summed only
-- over 'counted' SP forms — same convention as calculate_risk_score.sql's
-- weighted_sum, so the two numbers stay consistent for a given control.
-- LEFT JOIN so that compound forms with no sp_driver/sp_teammate rows still
-- appear in the result (e.g. newly-created controls or controls where driver
-- checks have not been added yet), instead of silently vanishing from the
-- citizen's view. Per docs/risk-score/formula.md §3 ("Täielik välistamine...
-- Samuti kui koondvormil pole ühtegi SP-alamvormi üldse"), a compound form
-- with NO sp_driver/sp_teammate rows at all is fully excluded — same rule
-- calculate_risk_score.sql encodes via its INNER JOIN (such forms never
-- reach per_control there, so they never contribute to r/R either). Hence
-- COALESCE(..., true) here, NOT false — zero SP rows must default to
-- "excluded", matching that INNER-JOIN behaviour's effect on the score.
per_control AS (
  SELECT
    qf.compound_form_key,
    COALESCE(BOOL_AND(sfc.category = 'excluded'), true) AS is_fully_excluded,
    COALESCE(SUM(CASE WHEN sfc.category = 'counted' THEN sfc.n_msi ELSE 0 END), 0) AS n_msi,
    COALESCE(SUM(CASE WHEN sfc.category = 'counted' THEN sfc.n_vsi ELSE 0 END), 0) AS n_vsi,
    COALESCE(SUM(CASE WHEN sfc.category = 'counted' THEN sfc.n_si  ELSE 0 END), 0) AS n_si,
    COALESCE(SUM(CASE WHEN sfc.category = 'counted' THEN sfc.n_mi  ELSE 0 END), 0) AS n_mi,
    COALESCE(SUM(CASE WHEN sfc.category = 'counted'
                       THEN sfc.n_msi * 90 + sfc.n_vsi * 30 + sfc.n_si * 10 + sfc.n_mi * 1
                       ELSE 0 END), 0) AS weighted_points
  FROM qualifying_forms qf
  LEFT JOIN sp_form_category sfc ON sfc.compound_form_key = qf.compound_form_key
  GROUP BY qf.compound_form_key
)
SELECT
  pc.compound_form_key,
  fs.form_number,
  fs.main_date,
  fs.vehicle_reg_nr,
  pc.is_fully_excluded,
  pc.n_msi,
  pc.n_vsi,
  pc.n_si,
  pc.n_mi,
  pc.weighted_points
FROM per_control pc
JOIN forms.form_search fs ON fs.form_type = 'compound' AND fs.form_key = pc.compound_form_key
ORDER BY fs.main_date DESC, pc.compound_form_key DESC;
