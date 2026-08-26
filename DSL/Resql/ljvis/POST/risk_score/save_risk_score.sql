/*
declaration:
  version: 0.1
  description: >-
    LJVIS2-151: appends one historical risk-score record. Insert-only by
    design — a company's score is NEVER updated in place, so admin list,
    citizen view and future ERRU CTUD integration always agree on the same
    value, and past algorithm-version results remain queryable (see
    docs/risk-score/formula.md).
  method: post
  accepts: json
  returns: json
  namespace: risk_score
  allowlist:
    body:
      - field: company_reg_code
        type: string
      - field: company_name
        type: string
      - field: risk_score
        type: string
      - field: risk_band_code
        type: string
      - field: total_controls
        type: number
      - field: g_factor
        type: string
      - field: window_start
        type: string
      - field: window_end
        type: string
      - field: calculation_trigger
        type: string
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: string
      - field: risk_band_code
        type: string
      - field: risk_score
        type: string
      - field: total_controls
        type: number
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
