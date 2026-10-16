/*
description: Resolve the company from a stored control; never trust a caller-supplied company code.
namespace: risk_score
params:
  form_type:
    type: string
    required: true
  form_key:
    type: string
    required: true
returns:
- name: company_reg_code
  type: string
  nullable: true
*/
WITH source AS (
 SELECT company_reg_code,status,created_at,id FROM forms.compound_form WHERE :form_type='compound' AND compound_form_key=:form_key::BIGINT
 UNION ALL
 SELECT company_reg_code,status,created_at,id FROM forms.tram_control_card WHERE :form_type='tram_control_card' AND tram_control_card_key=:form_key::BIGINT
 UNION ALL
 SELECT company_reg_code,status,created_at,id FROM forms.labour_inspection_form WHERE :form_type='labour_inspection' AND labour_inspection_form_key=:form_key::BIGINT
), latest AS (SELECT * FROM source ORDER BY created_at DESC,id DESC LIMIT 1)
SELECT company_reg_code FROM latest WHERE status IN ('published','deleted') AND company_reg_code ~ '^[0-9]{8}$';
