/*
description: Full nightly risk-score recalculation candidates. Includes every Estonian company with a published control or a historical score, so missed publication updates and expired controls are repaired.
namespace: risk_score
params: {}
returns:
- name: companyRegCode
  type: string
  nullable: true
*/
-- Revisit every known Estonian undertaking, including previously scored ones.
-- This repairs failed publication recalculations and ages out old controls.
SELECT company_reg_code FROM forms.compound_form WHERE status='published' AND company_reg_code ~ '^[0-9]{8}$'
UNION
SELECT company_reg_code FROM forms.foreign_violation_form WHERE status='published' AND company_reg_code ~ '^[0-9]{8}$'
UNION
SELECT company_reg_code FROM forms.tram_control_card WHERE status='published' AND company_reg_code ~ '^[0-9]{8}$'
UNION
SELECT company_reg_code FROM forms.labour_inspection_form WHERE status='published' AND company_reg_code ~ '^[0-9]{8}$'
UNION
SELECT company_reg_code FROM risk.company_risk_score WHERE company_reg_code ~ '^[0-9]{8}$';
