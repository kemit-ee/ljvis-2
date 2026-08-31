/*
declaration:
  version: 0.1
  description: "Read one CTUD request by its logical key (LJVIS2-143). Returns the LATEST snapshot only — current state is always the most recent row for ctud_request_key. Returns zero rows when the key does not exist, which the caller maps to 404. Columns are emitted in snake_case and serialised to camelCase by Resql; response_content is cast to text so the JSONB document is passed through verbatim."
  method: post
  accepts: json
  returns: json
  namespace: erru
  allowlist:
    body:
      - field: id
        type: string
        description: "CTUD request logical key (ctud_request_key)"
  response:
    fields:
      - field: id
        type: number
      - field: version
        type: number
      - field: direction
        type: string
      - field: status
        type: string
      - field: business_case_id
        type: string
      - field: technical_id
        type: string
      - field: workflow_id
        type: string
      - field: sent_at
        type: string
      - field: ctud_from
        type: string
      - field: ctud_to
        type: string
      - field: originating_authority
        type: string
      - field: request_source
        type: string
      - field: request_purpose
        type: string
      - field: transport_undertaking_name
        type: string
      - field: community_licence_number
        type: string
      - field: vehicle_registration_number
        type: string
      - field: vehicle_registration_country
        type: string
      - field: request_all_vehicles
        type: boolean
      - field: responding_authority
        type: string
      - field: response_status_code
        type: string
      - field: response_status_message
        type: string
      - field: response_content
        type: string
      - field: handler_personal_code
        type: string
      - field: handler_name
        type: string
      - field: error_message
        type: string
      - field: created_at
        type: string
      - field: created_by
        type: string
*/
SELECT
  ctud_request_key AS id,
  version,
  direction,
  status,
  business_case_id,
  technical_id,
  workflow_id,
  sent_at,
  ctud_from,
  ctud_to,
  originating_authority,
  request_source,
  request_purpose,
  transport_undertaking_name,
  community_licence_number,
  vehicle_registration_number,
  vehicle_registration_country,
  request_all_vehicles,
  responding_authority,
  response_status_code,
  response_status_message,
  response_content::text,
  handler_personal_code,
  handler_name,
  error_message,
  created_at,
  created_by
FROM erru.ctud_request
WHERE ctud_request_key = :id::BIGINT
ORDER BY created_at DESC
LIMIT 1;
