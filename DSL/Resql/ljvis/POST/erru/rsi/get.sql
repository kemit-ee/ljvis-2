/*
declaration:
  version: 0.1
  description: "Read one RSI message by its logical key (LJVIS2-147). Returns the LATEST snapshot only — current state is always the most recent row for rsi_message_key. Returns zero rows when the key does not exist, which the caller maps to 404. Columns are emitted in snake_case and serialised to camelCase by Resql; identification_details/checked_items are cast to text so the JSONB documents pass through verbatim."
  method: post
  accepts: json
  returns: json
  namespace: erru
  allowlist:
    body:
      - field: id
        type: string
        description: "RSI message logical key (rsi_message_key)"
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
      - field: rsi_from
        type: string
      - field: rsi_to
        type: string
      - field: originating_authority
        type: string
      - field: request_source
        type: string
      - field: request_purpose
        type: string
      - field: vehicle_category
        type: string
      - field: vehicle_registration_number
        type: string
      - field: vehicle_registration_country
        type: string
      - field: vehicle_identification_number
        type: string
      - field: odometer_reading
        type: number
      - field: driver_first_name
        type: string
      - field: driver_family_name
        type: string
      - field: driver_licence_number
        type: string
      - field: driver_licence_country
        type: string
      - field: identification_details
        type: string
      - field: inspection_identifier
        type: string
      - field: inspection_location
        type: string
      - field: inspection_datetime
        type: string
      - field: inspection_authority_or_name
        type: string
      - field: inspection_passed
        type: boolean
      - field: pti_requested
        type: boolean
      - field: vehicle_prohibition_or_restriction
        type: boolean
      - field: checked_items
        type: string
      - field: response_status_code
        type: string
      - field: response_status_message
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
  rsi_message_key AS id,
  version,
  direction,
  status,
  business_case_id,
  technical_id,
  workflow_id,
  sent_at,
  rsi_from,
  rsi_to,
  originating_authority,
  request_source,
  request_purpose,
  vehicle_category,
  vehicle_registration_number,
  vehicle_registration_country,
  vehicle_identification_number,
  odometer_reading,
  driver_first_name,
  driver_family_name,
  driver_licence_number,
  driver_licence_country,
  identification_details::text,
  inspection_identifier,
  inspection_location,
  inspection_datetime,
  inspection_authority_or_name,
  inspection_passed,
  pti_requested,
  vehicle_prohibition_or_restriction,
  checked_items::text,
  response_status_code,
  response_status_message,
  handler_personal_code,
  handler_name,
  error_message,
  created_at,
  created_by
FROM erru.rsi_message
WHERE rsi_message_key = :id::BIGINT
ORDER BY created_at DESC
LIMIT 1;
