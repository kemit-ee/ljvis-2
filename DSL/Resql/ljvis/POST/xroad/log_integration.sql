/*
declaration:
  version: 0.1
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
  response:
    fields:
      - field: id
        type: string
*/
INSERT INTO xroad.xroad_integration_log
    (service_code, request_xml, response_xml, duration_ms, success, error_message)
VALUES
    (:service_code, :request_xml, :response_xml, :duration_ms, :success, :error_message)
RETURNING id;
