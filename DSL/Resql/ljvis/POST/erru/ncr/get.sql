/*
declaration:
  version: 0.1
  description: "Read the full history of one NCR case (LJVIS2-63). Returns EVERY snapshot for
    the given business_case_id, ordered by created_at ASC — the caller treats the LAST element
    as the current state (for the editable header/blocks) and the WHOLE array as the read-only
    'Juhtumi teadete loend'. Returns zero rows when the case does not exist, which the caller
    maps to 404. Columns are emitted in snake_case and serialised to camelCase by Resql; JSONB
    columns are cast to text so the documents pass through verbatim to the DMapper template."
  method: post
  accepts: json
  returns: json
  namespace: erru
  allowlist:
    body:
      - field: businessCaseId
        type: string
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
      - field: pre_forwarding_status
        type: string
      - field: business_case_id
        type: string
      - field: technical_id
        type: string
      - field: workflow_id
        type: string
      - field: sent_at
        type: string
      - field: ncr_from
        type: string
      - field: ncr_to
        type: string
      - field: originating_authority
        type: string
      - field: request_source
        type: string
      - field: request_purpose
        type: string
      - field: ack_status_code
        type: string
      - field: ack_status_message
        type: string
      - field: ack_received_at
        type: string
      - field: response_status_code
        type: string
      - field: response_status_message
        type: string
      - field: transport_undertaking_name
        type: string
      - field: community_licence_number
        type: string
      - field: vehicle_registration_number
        type: string
      - field: vehicle_registration_country
        type: string
      - field: check_result
        type: string
      - field: check_date
        type: string
      - field: minor_infringement
        type: string
      - field: serious_infringements
        type: string
      - field: response_penalties_imposed
        type: string
      - field: responding_authority
        type: string
      - field: response_number_of_vehicles
        type: number
      - field: response_community_licence_status
        type: string
      - field: response_address
        type: string
      - field: linked_foreign_violation_form_key
        type: number
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
