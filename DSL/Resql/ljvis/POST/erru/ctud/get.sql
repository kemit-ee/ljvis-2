/*
description: "Read one CTUD request by its logical key (LJVIS2-143). Returns the LATEST snapshot only — current state is always the most recent row for ctud_request_key. Returns zero rows when the key does not exist, which the caller maps to 404. Columns are emitted in snake_case and serialised to camelCase by Resql; response_content is cast to text so the JSONB document is passed through verbatim."
namespace: erru
params:
  id:
    type: string
    required: false
    description: "CTUD request logical key (ctud_request_key)"
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
  - name: ctud_from
    type: string
    nullable: true
  - name: ctud_to
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
  - name: transport_undertaking_name
    type: string
    nullable: true
  - name: community_licence_number
    type: string
    nullable: true
  - name: vehicle_registration_number
    type: string
    nullable: true
  - name: vehicle_registration_country
    type: string
    nullable: true
  - name: request_all_vehicles
    type: boolean
    nullable: true
  - name: responding_authority
    type: string
    nullable: true
  - name: response_status_code
    type: string
    nullable: true
  - name: response_status_message
    type: string
    nullable: true
  - name: response_content
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
