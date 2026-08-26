/*
description: "Read one RSI message by its logical key (LJVIS2-147). Returns the LATEST snapshot only — current state is always the most recent row for rsi_message_key. Returns zero rows when the key does not exist, which the caller maps to 404. Columns are emitted in snake_case and serialised to camelCase by Resql; identification_details/checked_items are cast to text so the JSONB documents pass through verbatim."
namespace: erru
params:
  id:
    type: number
    required: false
    description: "RSI message logical key (rsi_message_key)"
returns:
  - name: id
    type: number
    nullable: true
  - name: version
    type: number
    nullable: true
  - name: direction
    type: string
    nullable: true
  - name: status
    type: string
    nullable: true
  - name: business_case_id
    type: string
    nullable: true
  - name: technical_id
    type: string
    nullable: true
  - name: workflow_id
    type: string
    nullable: true
  - name: sent_at
    type: string
    nullable: true
  - name: rsi_from
    type: string
    nullable: true
  - name: rsi_to
    type: string
    nullable: true
  - name: originating_authority
    type: string
    nullable: true
  - name: request_source
    type: string
    nullable: true
  - name: request_purpose
    type: string
    nullable: true
  - name: vehicle_category
    type: string
    nullable: true
  - name: vehicle_registration_number
    type: string
    nullable: true
  - name: vehicle_registration_country
    type: string
    nullable: true
  - name: vehicle_identification_number
    type: string
    nullable: true
  - name: odometer_reading
    type: number
    nullable: true
  - name: driver_first_name
    type: string
    nullable: true
  - name: driver_family_name
    type: string
    nullable: true
  - name: driver_licence_number
    type: string
    nullable: true
  - name: driver_licence_country
    type: string
    nullable: true
  - name: identification_details
    type: string
    nullable: true
  - name: inspection_identifier
    type: string
    nullable: true
  - name: inspection_location
    type: string
    nullable: true
  - name: inspection_datetime
    type: string
    nullable: true
  - name: inspection_authority_or_name
    type: string
    nullable: true
  - name: inspection_passed
    type: boolean
    nullable: true
  - name: pti_requested
    type: boolean
    nullable: true
  - name: vehicle_prohibition_or_restriction
    type: boolean
    nullable: true
  - name: checked_items
    type: string
    nullable: true
  - name: response_status_code
    type: string
    nullable: true
  - name: response_status_message
    type: string
    nullable: true
  - name: handler_personal_code
    type: string
    nullable: true
  - name: handler_name
    type: string
    nullable: true
  - name: error_message
    type: string
    nullable: true
  - name: created_at
    type: string
    nullable: true
  - name: created_by
    type: string
    nullable: true
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
