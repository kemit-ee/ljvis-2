/*
declaration:
  version: 0.1
  description: >-
    Write the extraordinary inspection date found via the hourly
    yvkehtivus sync (LJVIS2-135/58/23) onto the latest
    vehicle_technical_form snapshot, in place — same non-version-bumping
    convention as update-xroad-fields.sql. Scoped to only this one column
    so this job can never clobber enforcement_decision/proceeding_closure_basis,
    which come from a separate manual channel
    (edit/xroad/save-xroad-fields.yml) this cron job knows nothing about.
    Self-guarded (status='confirmed' AND extraordinary_inspection_date IS
    NULL AND the incoming date is non-empty) — makes repeat calls
    idempotent, and the caller invokes this unconditionally once per
    candidate even when yvkehtivus found nothing (Ruuter's iterate step
    can't branch on `next:` inside `do:`). The NULLIF(...) IS NOT NULL
    guard matters specifically because without it an empty date would
    still match the WHERE and `''::DATE` would error at execution.
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: key
        type: string
        description: "vehicle_technical_form_key"
      - field: extraordinaryInspectionDate
        type: string
        description: "ISO date (yyyy-MM-dd); empty/omitted is a no-op."
  response:
    fields:
      - field: id
        type: number
      - field: subFormNumber
        type: string
      - field: version
        type: number
*/
UPDATE forms.vehicle_technical_form t
SET extraordinary_inspection_date = NULLIF(:extraordinaryInspectionDate, '')::DATE
WHERE t.id = (
    SELECT id FROM forms.vehicle_technical_form
    WHERE vehicle_technical_form_key = :key::BIGINT
    ORDER BY created_at DESC
    LIMIT 1
)
  AND t.status = 'confirmed'
  AND t.extraordinary_inspection_date IS NULL
  AND NULLIF(:extraordinaryInspectionDate, '') IS NOT NULL
RETURNING t.vehicle_technical_form_key AS id, t.sub_form_number, t.version;
