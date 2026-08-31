/*
declaration:
  version: 0.1
  description: "Delete ADR sub-form — copy latest snapshot with status=deleted"
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: id
        type: string
      - field: status
        type: string
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
      - field: subFormNumber
        type: string
*/
WITH latest AS (
  SELECT DISTINCT ON (adr_form_key)
    adr_form_key,
    compound_form_key,
    sub_form_number,
    version,
    driver_assistant,
    driver_adr_certificate_number,
    crew_adr_certificate_number,
    assistant_adr_certificate_number,
    last_load_address,
    last_load_date,
    next_load_address,
    dangerous_goods,
    exemption_applied,
    exemption_adr_provision,
    container_type,
    infringements,
    other_violations,
    result_type,
    proceeding_type,
    proceeding_reference_number,
    corrective_measures,
    seal_opened,
    seal_opened_date,
    seal_installed_date,
    notes,
    enforcement_decision,
    proceeding_closure_basis
  FROM forms.adr_form
  WHERE adr_form_key = :id::BIGINT
  ORDER BY adr_form_key, created_at DESC
)
INSERT INTO forms.adr_form (
  adr_form_key,
  compound_form_key,
  sub_form_number,
  version,
  status,
  driver_assistant,
  driver_adr_certificate_number,
  crew_adr_certificate_number,
  assistant_adr_certificate_number,
  last_load_address,
  last_load_date,
  next_load_address,
  dangerous_goods,
  exemption_applied,
  exemption_adr_provision,
  container_type,
  infringements,
  other_violations,
  result_type,
  proceeding_type,
  proceeding_reference_number,
  corrective_measures,
  seal_opened,
  seal_opened_date,
  seal_installed_date,
  notes,
  enforcement_decision,
  proceeding_closure_basis,
  created_by
)
SELECT
  l.adr_form_key,
  l.compound_form_key,
  l.sub_form_number,
  l.version,
  :status,
  l.driver_assistant,
  l.driver_adr_certificate_number,
  l.crew_adr_certificate_number,
  l.assistant_adr_certificate_number,
  l.last_load_address,
  l.last_load_date,
  l.next_load_address,
  l.dangerous_goods,
  l.exemption_applied,
  l.exemption_adr_provision,
  l.container_type,
  l.infringements,
  l.other_violations,
  l.result_type,
  l.proceeding_type,
  l.proceeding_reference_number,
  l.corrective_measures,
  l.seal_opened,
  l.seal_opened_date,
  l.seal_installed_date,
  l.notes,
  l.enforcement_decision,
  l.proceeding_closure_basis,
  :created_by
FROM latest l
RETURNING adr_form_key AS id, sub_form_number;
