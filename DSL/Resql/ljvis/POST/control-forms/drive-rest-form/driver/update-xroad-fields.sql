/*
declaration:
  version: 0.1
  description: "Kirjuta e-toimiku päringu tulemus (jõustunud otsus + menetluse lõpetamise alus) autojuhi alamvormi UUSIMALE confirmed snapshot-reale KOHAPEAL — ei lisa uut snapshot-i, ei muuda template_version'i. found != true või juba täidetud enforcement_decision on no-op (0 rida) — cron/etoimik-sp-driver-decision-sync.yml kutsub seda iga kandidaadi kohta tingimusteta."
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: key
        type: string
        description: "sp_driver_form_key"
      - field: found
        type: string
        description: "'true'/'1'/'yes' kui e-toimik tagastas jõustunud otsuse; muidu no-op."
      - field: enforcementDecision
        type: string
      - field: proceedingClosureBasis
        type: string
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
      - field: subFormNumber
        type: string
*/
UPDATE forms.sp_driver_form t
SET
  enforcement_decision     = NULLIF(:enforcementDecision, ''),
  proceeding_closure_basis = NULLIF(:proceedingClosureBasis, '')
WHERE t.id = (
    SELECT id FROM forms.sp_driver_form
    WHERE sp_driver_form_key = :key::BIGINT
    ORDER BY created_at DESC
    LIMIT 1
  )
  AND t.status = 'confirmed'
  AND t.enforcement_decision IS NULL
  AND :found IN ('true', '1', 'yes')
  AND NULLIF(:enforcementDecision, '') IS NOT NULL
RETURNING sp_driver_form_key AS id, sub_form_number;
