/*
description: Audit event for the hourly yvkehtivus sync writing extraordinary_inspection_date onto a trailer
  technical-check sub-form (LJVIS2-135/58/23, 15 ettepanekut p15). Mirrors vehicle-technical/log_yvkehtivus_audit.sql.
  Writes directly to audit.audit_event rather than through the session-gated log-audit-event template,
  since Ruuter.internal has no session. No-op (0 rows) when applied=false, mirroring
  update-extraordinary-inspection-date.sql's guard.
namespace: control-forms
params:
  applied:
    type: string
    required: false
    description: '''true''/''1''/''yes'' when update-extraordinary-inspection-date.sql actually wrote
      a row; anything else is a no-op.'
  key:
    type: string
    required: false
  sub_form_number:
    type: string
    required: false
  version:
    type: string
    required: false
  inspection_date:
    type: string
    required: false
returns:
- name: event_id
  type: string
  nullable: true
*/
INSERT INTO audit.audit_event (
    event_id,
    event_type,
    event_category,
    actor_name,
    actor_personal_code_hash,
    description,
    log_content,
    created_by
)
SELECT
    audit.generate_ulid(),
    'control_form.trailer_technical.save_xroad',
    'control_form',
    'system',
    audit.hash_personal_code(''),
    'Tehnovormi X-tee väljad salvestatud (yvkehtivus), alamvormi võti=' || :key
      || ', alamvormi number=' || COALESCE(NULLIF(:sub_form_number, ''), '-')
      || '/' || COALESCE(NULLIF(:version, ''), '-')
      || ', erakorralise ülevaatuse kuupäev=' || COALESCE(NULLIF(:inspection_date, ''), '-'),
    jsonb_build_object(
      'subFormKey', :key,
      'extraordinaryInspectionDate', NULLIF(:inspection_date, '')
    ),
    'system'
WHERE :applied IN ('true', '1', 'yes')
RETURNING event_id;
