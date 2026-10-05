/*
description: 'Kirjuta e-toimiku päringu tulemus meeskonnaliikme SP alamvormi uusimale confirmed snapshot-reale
  ja avalikusta see automaatselt. INSERT-only: lisab uue snapshot-rea (revision + 1, version ja kõik muud
  väljad kantakse edasi), vana rida jääb ajalukku. version ei muutu (LJVIS2-72 §4: X-tee väljad ei mõjuta
  /V järelliidet). found != true või juba täidetud enforcement_decision on no-op (0 rida) — cron kutsub seda
  iga kandidaadi kohta tingimusteta. created_by = ''system''.'
namespace: control-forms
params:
  key:
    type: integer
    required: false
    description: sp_teammate_form_key
  found:
    type: string
    required: false
    description: '''true''/''1''/''yes'' kui e-toimik tagastas jõustunud otsuse; muidu no-op.'
  enforcementDecision:
    type: string
    required: false
  proceedingClosureBasis:
    type: string
    required: false
returns:
- name: id
  type: number
  nullable: true
- name: subFormNumber
  type: string
  nullable: true
*/
WITH latest AS (
  SELECT *
  FROM forms.sp_teammate_form
  WHERE sp_teammate_form_key = :key::BIGINT
  ORDER BY created_at DESC
  LIMIT 1
)
INSERT INTO forms.sp_teammate_form
SELECT (jsonb_populate_record(
    NULL::forms.sp_teammate_form,
    to_jsonb(l) || jsonb_build_object(
      'id', nextval('forms.sp_teammate_form_id_seq'),
      'revision', l.revision + 1,
      'created_at', now(),
      'created_by', 'system',
      'enforcement_decision', NULLIF(:enforcementDecision, ''),
      'proceeding_closure_basis', NULLIF(:proceedingClosureBasis, ''),
      'status', 'published'
    )
)).*
FROM latest l
WHERE l.status = 'confirmed'
  AND l.enforcement_decision IS NULL
  AND :found IN ('true', '1', 'yes')
  AND NULLIF(:enforcementDecision, '') IS NOT NULL
RETURNING sp_teammate_form_key AS id, sub_form_number;
