/*
declaration:
  version: 0.2
  description: "Insert X-Road integration log entry"
  method: post
  namespace: xroad
  returns: json
  allowlist:
    body:
      - field: service_code
        type: string
      - field: request_xml
        type: string
      - field: response_xml
        type: string
      - field: duration_ms
        type: integer
      - field: success
        type: boolean
      - field: error_message
        type: string
      - field: person_identifier
        type: string
        description: "Optional (LJVIS2-56): personal code of the person a query was about, in plaintext, ONLY when identified by personal code. Leave blank/omit when identified by name+birthdate (foreigner) — never populate in that case."
      - field: source_type
        type: string
        description: "Optional: which feature/entity triggered this call, e.g. 'compound_form'."
      - field: source_record_id
        type: string
        description: "Optional: the specific record identifier within source_type, e.g. a compound_form_key."
  response:
    fields:
      - field: id
        type: string
*/
INSERT INTO xroad.xroad_integration_log
    (service_code, request_xml, response_xml, duration_ms, success, error_message, person_identifier, source_type, source_record_id)
VALUES
    (:service_code, :request_xml, :response_xml, :duration_ms::INTEGER, :success, :error_message, NULLIF(:person_identifier, ''), NULLIF(:source_type, ''), NULLIF(:source_record_id, ''))
RETURNING id;
