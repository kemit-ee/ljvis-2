/*
description: "Insert X-Road integration log entry"
namespace: xroad
params:
  service_code:
    type: string
    required: false
  request_xml:
    type: string
    required: false
  response_xml:
    type: string
    required: false
  duration_ms:
    type: integer
    required: false
  success:
    type: boolean
    required: false
  error_message:
    type: string
    required: false
  person_identifier:
    type: string
    required: false
    description: "Optional (LJVIS2-56): personal code of the person a query was about, in plaintext, ONLY when identified by personal code. Leave blank/omit when identified by name+birthdate (foreigner) — never populate in that case."
  source_type:
    type: string
    required: false
    description: "Optional: which feature/entity triggered this call, e.g. 'compound_form'."
  source_record_id:
    type: string
    required: false
    description: "Optional: the specific record identifier within source_type, e.g. a compound_form_key."
returns:
  - name: id
    type: string
    nullable: true
*/
INSERT INTO xroad.xroad_integration_log
    (service_code, request_xml, response_xml, duration_ms, success, error_message, person_identifier, source_type, source_record_id)
VALUES
    (:service_code, :request_xml, :response_xml, :duration_ms::INTEGER, :success, :error_message, NULLIF(:person_identifier, ''), NULLIF(:source_type, ''), NULLIF(:source_record_id, ''))
RETURNING id;
