/*
description: 'Write the extraordinary inspection date found via the hourly yvkehtivus sync (LJVIS2-135/58/23,
  15 ettepanekut p15) onto the latest trailer_technical_form snapshot, in place — mirrors
  vehicle-technical/update-extraordinary-inspection-date.sql. Scoped to only this one column so this
  job can never clobber enforcement_decision/proceeding_closure_basis, which come from a separate cron
  (cron/etoimik-technical-check-decision-sync.yml). Self-guarded (status=''confirmed'' AND
  extraordinary_inspection_date IS NULL AND the incoming date is non-empty) — makes repeat calls
  idempotent, and the caller invokes this unconditionally once per candidate even when yvkehtivus found
  nothing (Ruuter''s iterate step can''t branch on `next:` inside `do:`).'
namespace: control-forms
params:
  key:
    type: integer
    required: false
    description: trailer_technical_form_key
  extraordinaryInspectionDate:
    type: string
    required: false
    description: ISO date (yyyy-MM-dd); empty/omitted is a no-op.
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
UPDATE forms.trailer_technical_form t
SET extraordinary_inspection_date = NULLIF(:extraordinaryInspectionDate, '')::DATE
WHERE t.id = (
    SELECT id FROM forms.trailer_technical_form
    WHERE trailer_technical_form_key = :key::BIGINT
    ORDER BY created_at DESC
    LIMIT 1
)
  AND t.status = 'confirmed'
  AND t.extraordinary_inspection_date IS NULL
  AND NULLIF(:extraordinaryInspectionDate, '') IS NOT NULL
RETURNING t.trailer_technical_form_key AS id, t.sub_form_number, t.version;
