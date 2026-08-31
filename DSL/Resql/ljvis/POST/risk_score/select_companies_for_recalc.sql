/*
declaration:
  version: 0.1
  description: >-
    Candidates for the nightly risk-score recalculation (LJVIS2-150/151/152):
    every distinct Estonian company_reg_code whose risk score could plausibly
    have changed since the last run. No "latest snapshot" resolution is
    needed here, unlike select_etoimik_candidates.sql/
    select_yvkehtivus_candidates.sql — this query returns a distinct set of
    reg codes, not "the current state of one entity".

    A company's score can only change for two reasons, so we look for two
    narrow bands instead of scanning the whole 2-year window every night:

    1. "Recent" band (created_at >= now() - 3 days): a NEW qualifying
       control appeared. This must check compound_form.created_at (a new
       case), AND ALSO sp_driver_form.created_at / sp_teammate_form.created_at
       (a sub-form was (re-)published on an ALREADY-published, older
       compound_form — confirmed possible: frontend's DriveRestFormPage
       allows editing sub-forms while compoundForm.status is already
       'published' (canEdit includes status==='published'), and neither
       drive-rest-form/driver/edit/save.yml nor its .guard check the parent
       compound_form's status at all. So a case published months ago can
       still get a corrected/added violation published today, changing the
       score with zero new compound_form activity — a filter on
       compound_form.created_at alone would silently miss this).
    2. "Boundary" band (compound_form.created_at within 2 years ± 3 days):
       an existing control's enforcement_date (= MIN(created_at) FILTER
       (WHERE status='published'), grouped per compound_form_key — see
       calculate_risk_score.sql) is about to age out of the 2-year window
       with zero new activity. Only compound_form.created_at matters here —
       enforcement_date is defined purely by the compound_form snapshot
       history, not by sub-form timestamps. The ±3 day slack absorbs up to
       2 consecutive missed nightly runs (cron interval = 1 day, so
       2 × 1 + 1 = 3 days worst-case catch-up); it can only ever
       over-include (harmless extra recompute), never under-include, since
       the row defining enforcement_date is itself what this filter checks.

    calculate_risk_score.sql still applies the exact 2-year window and
    exact rules when it actually computes R — these two bands only decide
    who's *worth checking* tonight. Without them the candidate set would
    grow forever with total historical published-form volume, including
    companies whose last qualifying control was years ago and will never
    re-enter the window.
  method: post
  namespace: risk_score
  returns: json
  response:
    fields:
      - field: companyRegCode
        type: string
*/
WITH recent_or_boundary_compound AS (
  SELECT DISTINCT company_reg_code
  FROM forms.compound_form
  WHERE status = 'published'
    AND company_reg_code ~ '^[0-9]{8}$'
    AND (
      created_at >= (now() - INTERVAL '3 days')
      OR created_at BETWEEN (now() - INTERVAL '2 years' - INTERVAL '3 days')
                         AND (now() - INTERVAL '2 years' + INTERVAL '3 days')
    )
),
recent_sp_driver AS (
  SELECT DISTINCT cf.company_reg_code
  FROM forms.sp_driver_form sdf
  JOIN forms.compound_form cf ON cf.compound_form_key = sdf.compound_form_key
  WHERE sdf.status = 'published'
    AND sdf.created_at >= (now() - INTERVAL '3 days')
    AND cf.status = 'published'
    AND cf.company_reg_code ~ '^[0-9]{8}$'
),
recent_sp_teammate AS (
  SELECT DISTINCT cf.company_reg_code
  FROM forms.sp_teammate_form stf
  JOIN forms.compound_form cf ON cf.compound_form_key = stf.compound_form_key
  WHERE stf.status = 'published'
    AND stf.created_at >= (now() - INTERVAL '3 days')
    AND cf.status = 'published'
    AND cf.company_reg_code ~ '^[0-9]{8}$'
)
SELECT company_reg_code FROM recent_or_boundary_compound
UNION
SELECT company_reg_code FROM recent_sp_driver
UNION
SELECT company_reg_code FROM recent_sp_teammate;
