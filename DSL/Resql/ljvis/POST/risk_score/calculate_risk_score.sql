/*
declaration:
  version: 0.1
  description: >-
    LJVIS2-151: computes (but does NOT persist — see save_risk_score.sql) the
    EU 2022/695 risk score R for one Estonian transport undertaking, over a
    caller-supplied [window_start, window_end] date window (normally "now -
    2 years" .. "now"). Only forms.compound_form rows with status='published'
    and an 8-digit Estonian company_reg_code count; "enforcement date" is the
    first time a given compound_form_key reached status='published'
    (MIN(created_at) FILTER). Violation severity/isDetected keys inside the
    JSONB violation arrays are camelCase (violationCode/severityCode/
    isDetected) because they are the raw frontend Formik field shape
    (frontend/src/features/control-forms/types.ts Violation/DocumentCheck/
    CabotageViolation) persisted as-is — NOT snake_case. See
    docs/risk-score/formula.md for the full formula/rules writeup.
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
      - field: risk_score
        type: string
      - field: risk_band_code
        type: string
      - field: total_controls
        type: number
      - field: company_name
        type: string
*/
WITH enforcement_dates AS (
  -- Jõustumiskuupäev = first time this compound_form_key became 'published'.
  SELECT compound_form_key, MIN(created_at) AS enforcement_date
  FROM forms.compound_form
  WHERE company_reg_code = :company_reg_code
    AND status = 'published'
  GROUP BY compound_form_key
),
qualifying_forms AS (
  -- Only Estonian companies (8-digit reg code) with an enforcement date inside the window.
  SELECT ed.compound_form_key, ed.enforcement_date
  FROM enforcement_dates ed
  WHERE :company_reg_code ~ '^[0-9]{8}$'
    AND ed.enforcement_date >= :window_start::DATE
    AND ed.enforcement_date <= (:window_end::DATE + INTERVAL '1 day')
),
sp_driver_latest AS (
  -- Latest snapshot per sp_driver_form_key (append-only table, same pattern
  -- as DSL/Resql/.../drive-rest-form/driver/get-by-compound-form-key.sql).
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
-- Count MSI/VSI/SI/MI occurrences across all 7 JSONB violation-carrying
-- fields of each SP form. violations_* entries require isDetected='true'
-- (string, not boolean) OR a missing isDetected key; document_checks and
-- cabotage_violations have no isDetected field at all, so every entry counts.
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
-- Classify each SP form: excluded (no contribution at all) / zero_point
-- (r++, 0 weighted points) / counted (r++, weighted points added).
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
-- Per compound_form_key: a control is fully excluded only if EVERY one of
-- its SP forms is 'excluded' (a compound_form with no SP forms at all never
-- appears here at all, since the JOIN below is INNER — which itself
-- satisfies the "no sp_driver/teammate_form => fully excluded" rule).
per_control AS (
  SELECT
    qf.compound_form_key,
    BOOL_AND(sfc.category = 'excluded') AS is_fully_excluded,
    COALESCE(SUM(CASE WHEN sfc.category = 'counted'
                       THEN sfc.n_msi * 90 + sfc.n_vsi * 30 + sfc.n_si * 10 + sfc.n_mi * 1
                       ELSE 0 END), 0) AS weighted_sum
  FROM qualifying_forms qf
  JOIN sp_form_category sfc ON sfc.compound_form_key = qf.compound_form_key
  GROUP BY qf.compound_form_key
),
formula AS (
  -- N (vehicles per control) is always 1 (task spec §2), so
  -- weighted_sum/N == weighted_sum; g=1.0 in this algorithm version.
  SELECT
    COUNT(*)::INTEGER AS r,
    COALESCE(SUM(weighted_sum), 0) AS total_weighted_sum
  FROM per_control
  WHERE NOT is_fully_excluded
),
result AS (
  SELECT
    CASE WHEN f.r = 0 THEN NULL
         ELSE ROUND((f.total_weighted_sum::NUMERIC / f.r) * 1.0, 4) END AS risk_score,
    f.r AS total_controls,
    CASE
      WHEN f.r = 0 THEN 'Hall'
      WHEN (f.total_weighted_sum::NUMERIC / f.r) * 1.0 <= 100 THEN 'Roheline'
      WHEN (f.total_weighted_sum::NUMERIC / f.r) * 1.0 <= 200 THEN 'Kollane'
      ELSE 'Punane'
    END AS risk_band_code
  FROM formula f
)
SELECT
  r.risk_score,
  r.risk_band_code,
  r.total_controls,
  -- Most recently known company_name for this reg_code, regardless of
  -- publish status (task spec: "viimati registreeritud ettevõtja nimi").
  -- A single scalar subquery ordered by created_at DESC across ALL
  -- compound_form rows for this reg_code — NOT per compound_form_key (a
  -- prior version used a DISTINCT-ON-per-key CTE with an unordered LIMIT 1
  -- on top, which could return an arbitrary company_name when the same
  -- company has multiple compound_forms with different recorded names).
  (SELECT cf.company_name FROM forms.compound_form cf
   WHERE cf.company_reg_code = :company_reg_code
   ORDER BY cf.created_at DESC LIMIT 1) AS company_name
FROM result r;
