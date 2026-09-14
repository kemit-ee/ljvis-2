/*
description: Auditisündmus kui e-toimiku öine cron kirjutas sõiduki tehnokontrolli alamvormile jõustunud
  otsuse (enforcement_decision/proceeding_closure_basis). found != true on no-op — cron kutsub seda iga
  kandidaadi kohta tingimusteta (Ruuteri iterate ei saa harusid teha). Sama event_type mis varasemal
  käsitsi-admin teel (control_form.vehicle_technical.save_xroad, vt log_yvkehtivus_audit.sql) —
  actor_name='e-toimik' ainus erinevus.
namespace: control-forms
params:
  found:
    type: string
    required: false
    description: '''true''/''1''/''yes'' kui otsus kirjutati; muidu no-op.'
  key:
    type: string
    required: false
    description: vehicle_technical_form_key
  sub_form_number:
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
    'control_form.vehicle_technical.save_xroad',
    'control_form_management',
    'E-toimik',
    audit.hash_personal_code(''),
    'E-toimiku päringuga kanti sõiduki tehnokontrolli alamvormile '
      || COALESCE(NULLIF(:sub_form_number, ''), :key)
      || ' jõustunud otsus (juhi isikukood: '
      || COALESCE(NULLIF(:driver_personal_code, ''), '-') || ')',
    jsonb_build_object(
      'subFormKey', :key,
      'subFormNumber', NULLIF(:sub_form_number, ''),
      'driverPersonalCode', NULLIF(:driver_personal_code, '')
    ),
    'e-toimik'
WHERE :found IN ('true', '1', 'yes')
RETURNING event_id;
