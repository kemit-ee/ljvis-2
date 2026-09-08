/*
description: 'Audit event for e-toimik''s auto-publish of a labour inspection act (LJVIS2-69 §254/§370:
  publish is system-authored, actor ''E-toimik''). Content mirrors log-labour-inspection-publish.yml (used
  by the human publish.yml endpoint) but writes directly to audit.audit_event, since that template chain
  expects a session cookie Ruuter.internal doesn''t have. No-op (0 rows) when found=false, mirroring apply_etoimik_decision.sql''s
  guard.'
namespace: control-forms
params:
  found:
    type: string
    required: false
    description: '''true''/''1''/''yes'' when apply_etoimik_decision.sql actually published the act; anything
      else is a no-op.'
  key:
    type: string
    required: false
    description: labour_inspection_form_key
  form_number:
    type: string
    required: false
  punished_person_id_code:
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
    'control_form.labour_inspection.publish',
    'control_form_management',
    'E-toimik',
    audit.hash_personal_code(''),
    'Avalikustati tööinspektsiooni kontrollakt ' || :form_number
      || ', karistatud isikukood: ' || COALESCE(NULLIF(:punished_person_id_code, ''), '-')
      || ', olek: confirmed → published',
    jsonb_build_object(
      'aktiVoti', :key,
      'vormiNumber', :form_number,
      'karistatudIsikukood', NULLIF(:punished_person_id_code, ''),
      'oldStatus', 'confirmed',
      'newStatus', 'published'
    ),
    'e-toimik'
WHERE :found IN ('true', '1', 'yes')
RETURNING event_id;
