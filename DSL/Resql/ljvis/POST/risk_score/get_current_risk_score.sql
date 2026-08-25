/*
declaration:
  version: 0.1
  description: "LJVIS2-151/144: latest risk-score record for a company (used by Ruuter.internal current.yml — CTUD ERRU integration + citizen view)."
  method: post
  accepts: json
  returns: json
  namespace: risk_score
  allowlist:
    body:
      - field: company_reg_code
        type: string
  response:
    fields:
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
      - field: window_start
        type: string
      - field: window_end
        type: string
      - field: created_at
        type: string
*/
SELECT company_reg_code, company_name, risk_score, risk_band_code,
       total_controls, window_start, window_end, created_at
FROM risk.company_risk_score
WHERE company_reg_code = :company_reg_code
ORDER BY created_at DESC
LIMIT 1;
