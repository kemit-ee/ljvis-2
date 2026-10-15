/*
description: 'Auditisündmus e-toimiku otsuse alusel avalikustatud autojuhi või meeskonnaliikme
  sõidu- ja puhkeaja alamvormile. found=false on no-op.'
namespace: control-forms
params:
  found:
    type: string
    required: false
  key:
    type: string
    required: false
  form_type:
    type: string
    required: false
  compound_form_key:
    type: string
    required: false
  sub_form_number:
    type: string
    required: false
  person_code:
    type: string
    required: false
  compound_published:
    type: string
    required: false
  compound_form_number:
    type: string
    required: false
returns:
- name: event_id
  type: string
  nullable: true
*/
WITH events AS (
  SELECT
    CASE WHEN :form_type = 'teammate'
      THEN 'control_form.sp_teammate_form.publish'
      ELSE 'control_form.sp_driver_form.publish' END AS event_type,
    'E-toimiku otsuse alusel avalikustati '
      || CASE WHEN :form_type = 'teammate' THEN 'meeskonnaliikme' ELSE 'autojuhi' END
      || ' sõidu- ja puhkeaja alamvorm '
      || COALESCE(NULLIF(:sub_form_number, ''), :key) AS description,
    jsonb_build_object(
      'subFormKey', :key,
      'compoundFormKey', :compound_form_key,
      'formType', :form_type,
      'subFormNumber', NULLIF(:sub_form_number, ''),
      'personCode', NULLIF(:person_code, ''),
      'oldStatus', 'confirmed',
      'newStatus', 'published'
    ) AS log_content
  WHERE :found IN ('true', '1', 'yes')
  UNION ALL
  SELECT
    'control_form.compound_form.publish',
    'Kõigi alamvormide avalikustamise järel avalikustati koondvorm '
      || COALESCE(NULLIF(:compound_form_number, ''), :compound_form_key),
    jsonb_build_object(
      'compoundFormKey', :compound_form_key,
      'formNumber', NULLIF(:compound_form_number, ''),
      'oldStatus', 'confirmed',
      'newStatus', 'published'
    )
  WHERE :compound_published IN ('true', '1', 'yes')
)
INSERT INTO audit.audit_event (
  event_id, event_type, event_category, actor_name, actor_personal_code_hash,
  description, log_content, created_by
)
SELECT
  audit.generate_ulid(),
  event_type,
  'control_form_management',
  'E-toimik',
  audit.hash_personal_code(''),
  description,
  log_content,
  'e-toimik'
FROM events
RETURNING event_id;
