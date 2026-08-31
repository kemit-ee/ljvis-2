/*
declaration:
  version: 0.2
  description: "Append a new labour_inspection_form snapshot with an entered-into-force e-toimik decision and auto-publish it (LJVIS2-69 §254/§370: e-toimik-initiated publish is system-authored, status goes straight to 'published'). INSERT-only, mirrors update.sql's copy-forward pattern. Called once per candidate unconditionally by cron/etoimik-decision-sync.yml — found=false, or a stale status<>'confirmed' guard, is a no-op (0 rows), since Ruuter's iterate step can't branch on `next:` inside `do:`. Does not call the session-gated publish.yml endpoint (Ruuter.internal has no session) — it only ever acts on the confirmed-only candidate set this cron selects, so there's no competition."
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: key
        type: string
        description: "labour_inspection_form_key"
      - field: found
        type: string
        description: "'true'/'1'/'yes' when e-toimik returned an entered-into-force decision; anything else is a no-op."
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
      - field: form_number
        type: string
      - field: version
        type: number
      - field: status
        type: string
*/
WITH latest AS (
  SELECT *
  FROM forms.labour_inspection_form
  WHERE labour_inspection_form_key = :key::BIGINT
  ORDER BY created_at DESC
  LIMIT 1
)
INSERT INTO forms.labour_inspection_form (
  labour_inspection_form_key,
  form_number,
  version,
  status,
  inspector_name,
  inspection_date,
  external_inspection_id,
  inspection_type,
  company_name,
  company_reg_code,
  vehicle_count,
  total_drivers_count,
  controls_matrix,
  prescription_composed,
  punished_person_id_code,
  punished_person_first_name,
  punished_person_last_name,
  proceeding_reference_number,
  enforcement_decision,
  proceeding_closure_basis,
  violations,
  created_by
)
SELECT
  labour_inspection_form_key,
  form_number,
  version + 1,
  'published',
  inspector_name,
  inspection_date,
  external_inspection_id,
  inspection_type,
  company_name,
  company_reg_code,
  vehicle_count,
  total_drivers_count,
  controls_matrix,
  prescription_composed,
  punished_person_id_code,
  punished_person_first_name,
  punished_person_last_name,
  proceeding_reference_number,
  :enforcementDecision,
  :proceedingClosureBasis,
  violations,
  :created_by
FROM latest
WHERE :found IN ('true', '1', 'yes')
  -- Defensive re-check: only ever publish out of 'confirmed' (same rule as
  -- publish.yml), in case the act changed between selection and this call.
  AND status = 'confirmed'
RETURNING labour_inspection_form_key AS id, form_number, version, status;
