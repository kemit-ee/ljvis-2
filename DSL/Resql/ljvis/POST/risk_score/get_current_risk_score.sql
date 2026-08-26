/*
description: "LJVIS2-151/144: latest risk-score record for a company (used by Ruuter.internal current.yml — CTUD ERRU integration + citizen view)."
namespace: risk_score
params:
  company_reg_code:
    type: string
    required: false
returns:
  - name: company_reg_code
    type: string
    nullable: true
  - name: company_name
    type: string
    nullable: true
  - name: risk_score
    type: string
    nullable: true
  - name: risk_band_code
    type: string
    nullable: true
  - name: total_controls
    type: number
    nullable: true
  - name: window_start
    type: string
    nullable: true
  - name: window_end
    type: string
    nullable: true
  - name: created_at
    type: string
    nullable: true
*/
SELECT company_reg_code, company_name, risk_score, risk_band_code,
       total_controls, window_start, window_end, created_at
FROM risk.company_risk_score
WHERE company_reg_code = :company_reg_code
ORDER BY created_at DESC
LIMIT 1;
