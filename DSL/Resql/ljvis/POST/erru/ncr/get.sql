/*
description: "Read the full history of one NCR case (LJVIS2-63). Returns EVERY snapshot for the given business_case_id, ordered by created_at ASC — the caller treats the LAST element as the current state (for the editable header/blocks) and the WHOLE array as the read-only 'Juhtumi teadete loend'. Returns zero rows when the case does not exist, which the caller maps to 404. Columns are emitted in snake_case and serialised to camelCase by Resql; JSONB columns are cast to text so the documents pass through verbatim to the DMapper template."
namespace: erru
params:
  businessCaseId:
    type: string
    required: false
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
  - name: pre_forwarding_status
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
  - name: ncr_from
    type: string
    nullable: true
  - name: ncr_to
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
  - name: ack_status_code
    type: string
    nullable: true
  - name: ack_status_message
    type: string
    nullable: true
  - name: ack_received_at
    type: string
    nullable: true
  - name: response_status_code
    type: string
    nullable: true
  - name: response_status_message
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
  - name: check_result
    type: string
    nullable: true
  - name: check_date
    type: string
    nullable: true
  - name: minor_infringement
    type: string
    nullable: true
  - name: serious_infringements
    type: string
    nullable: true
  - name: response_penalties_imposed
    type: string
    nullable: true
  - name: responding_authority
    type: string
    nullable: true
  - name: response_number_of_vehicles
    type: number
    nullable: true
  - name: response_community_licence_status
    type: string
    nullable: true
  - name: response_address
    type: string
    nullable: true
  - name: linked_foreign_violation_form_key
    type: number
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
  ncr_message_key AS id,
  version,
  direction,
  status,
  pre_forwarding_status,
  business_case_id,
  technical_id,
  workflow_id,
  sent_at,
  ncr_from,
  ncr_to,
  originating_authority,
  request_source,
  request_purpose,
  ack_status_code,
  ack_status_message,
  ack_received_at,
  response_status_code,
  response_status_message,
  transport_undertaking_name,
  community_licence_number,
  vehicle_registration_number,
  vehicle_registration_country,
  check_result,
  check_date,
  minor_infringement::text,
  serious_infringements::text,
  response_penalties_imposed::text,
  responding_authority,
  response_number_of_vehicles,
  response_community_licence_status,
  response_address::text,
  linked_foreign_violation_form_key,
  handler_personal_code,
  handler_name,
  error_message,
  created_at,
  created_by
FROM erru.ncr_message
WHERE business_case_id = :businessCaseId
ORDER BY created_at ASC;
