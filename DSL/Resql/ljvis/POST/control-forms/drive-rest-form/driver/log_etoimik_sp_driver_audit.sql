/*
declaration:
  version: 0.1
  description: "Auditisündmus kui e-toimiku cron kirjutas autojuhi alamvormile jõustunud otsuse. found != true on no-op — cron kutsub seda iga kandidaadi kohta tingimusteta (Ruuteri iterate ei saa harusid teha)."
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: found
        type: string
        description: "'true'/'1'/'yes' kui otsus kirjutati; muidu no-op."
      - field: key
        type: string
        description: "sp_driver_form_key"
      - field: sub_form_number
        type: string
      - field: driver_personal_code
        type: string
  response:
    fields:
      - field: event_id
        type: string
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
    'control_form.sp_driver.save_xroad',
    'control_form_management',
    'E-toimik',
    audit.hash_personal_code(''),
    'E-toimiku päringuga kanti autojuhi sõidu- ja puhkeaja alamvormile '
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
