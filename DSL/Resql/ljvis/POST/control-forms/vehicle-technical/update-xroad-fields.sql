/*
description: 'Kirjuta e-toimiku päringu tulemus (jõustunud otsus + menetluse lõpetamise alus) sõiduki
  tehnokontrolli alamvormi UUSIMALE confirmed snapshot-reale KOHAPEAL — ei lisa uut snapshot-i, ei muuda
  version''it (LJVIS2-72 §4: X-tee väljad ei mõjuta /V suffiksit). found != true või juba täidetud
  enforcement_decision on no-op (0 rida) — cron/etoimik-technical-check-decision-sync.yml kutsub seda
  iga kandidaadi kohta tingimusteta. Ei ole enam avalikult käivitatav endpoint (varasem käsitsi-admin
  edit/xroad/save-xroad-fields.yml on eemaldatud, 15 ettepanekut p9) — ainult see cron kirjutab neid
  välju. extraordinary_inspection_date on eraldi (update-extraordinary-inspection-date.sql, yvkehtivus-sync.yml).'
namespace: control-forms
params:
  key:
    type: integer
    required: false
    description: vehicle_technical_form_key
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
- name: version
  type: number
  nullable: true
*/
UPDATE forms.vehicle_technical_form t
SET
  enforcement_decision     = NULLIF(:enforcementDecision, ''),
  proceeding_closure_basis = NULLIF(:proceedingClosureBasis, '')
WHERE t.id = (
    SELECT id FROM forms.vehicle_technical_form
    WHERE vehicle_technical_form_key = :key::BIGINT
    ORDER BY created_at DESC
    LIMIT 1
  )
  AND t.status = 'confirmed'
  AND t.enforcement_decision IS NULL
  AND :found IN ('true', '1', 'yes')
  AND NULLIF(:enforcementDecision, '') IS NOT NULL
RETURNING t.vehicle_technical_form_key AS id, t.sub_form_number, t.version;
