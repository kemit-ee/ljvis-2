/*
description: 'Audit event for e-toimik''s auto-publish of a TRAM control card (ADR-002 otsus 3: publish is
  system-authored, actor ''E-toimik''). Writes directly to audit.audit_event since the human publish
  template chain expects a session cookie Ruuter.internal does not have. No-op (0 rows) when found=false.'
namespace: control-forms
params:
  found:
    type: string
    required: false
    description: '''true''/''1''/''yes'' when apply_etoimik_decision.sql actually published the card.'
  key:
    type: string
    required: false
    description: tram_control_card_key
  form_number:
    type: string
    required: false
  driver_personal_code:
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
    'control_form.tram_control_card.publish',
    'control_form_management',
    'E-toimik',
    audit.hash_personal_code(''),
    'Avalikustati TRAM kontrollkaart ' || :form_number
      || ', juhi isikukood: ' || COALESCE(NULLIF(:driver_personal_code, ''), '-')
      || ', olek: confirmed → published',
    jsonb_build_object(
      'tramControlCardKey', :key,
      'vormiNumber', :form_number,
      'juhiIsikukood', NULLIF(:driver_personal_code, ''),
      'oldStatus', 'confirmed',
      'newStatus', 'published'
    ),
    'e-toimik'
WHERE :found IN ('true', '1', 'yes')
RETURNING event_id;
