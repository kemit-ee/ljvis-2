/*
description: "LJVIS2-151: appends one historical risk-score record. Insert-only by design — a company's score is NEVER updated in place, so admin list, citizen view and future ERRU CTUD integration always agree on the same value, and past algorithm-version results remain queryable (see docs/risk-score/formula.md)."
namespace: risk_score
params:
  company_reg_code:
    type: string
    required: false
  company_name:
    type: string
    required: false
  risk_score:
    type: string
    required: false
  risk_band_code:
    type: string
    required: false
  total_controls:
    type: number
    required: false
  g_factor:
    type: string
    required: false
  window_start:
    type: string
    required: false
  window_end:
    type: string
    required: false
  calculation_trigger:
    type: string
    required: false
  created_by:
    type: string
    required: false
returns:
  - name: id
    type: string
    nullable: true
  - name: risk_band_code
    type: string
    nullable: true
  - name: risk_score
    type: string
    nullable: true
  - name: total_controls
    type: number
    nullable: true
*/
INSERT INTO risk.company_risk_score
    (company_reg_code, company_name, risk_score, risk_band_code, total_controls,
     g_factor, window_start, window_end, calculation_trigger, created_by)
VALUES
    (:company_reg_code, NULLIF(:company_name, ''), NULLIF(:risk_score, '')::NUMERIC, :risk_band_code,
     :total_controls::INTEGER, COALESCE(NULLIF(:g_factor, '')::NUMERIC, 1.0),
     :window_start::DATE, :window_end::DATE, :calculation_trigger,
     COALESCE(NULLIF(:created_by, ''), 'system'))
RETURNING id, risk_band_code, risk_score, total_controls;
