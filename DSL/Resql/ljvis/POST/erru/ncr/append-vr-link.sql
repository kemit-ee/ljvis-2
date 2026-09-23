/*
description: 'Link the outgoing foreign_violation_form created from an NCR message back onto the NCR
  message (LJVIS2-131/create-from-ncr.yml). erru.ncr_message is INSERT-only (UPDATE/DELETE forbidden,
  see 20260816100000-initial-erru-ncr.sql) — this must not UPDATE the latest snapshot in place, so it
  appends a new snapshot carrying every field forward unchanged except linked_foreign_violation_form_key.
  Guarded: the INSERT .. SELECT produces zero rows unless a snapshot exists for businessCaseId; the caller
  detects the empty result and returns 500 link_failed.'
namespace: erru
params:
  businessCaseId:
    type: string
    required: true
  foreignViolationFormKey:
    type: string
    required: true
  created_by:
    type: string
    required: false
returns:
- name: ncr_message_key
  type: number
  nullable: true
*/
WITH latest AS (
  SELECT *
  FROM erru.ncr_message
  WHERE business_case_id = :businessCaseId
  ORDER BY created_at DESC
  LIMIT 1
), ins AS (
  INSERT INTO erru.ncr_message (
    ncr_message_key, version, direction, status, pre_forwarding_status,
    business_case_id, technical_id, workflow_id, sent_at, ncr_from, ncr_to,
    originating_authority, request_source, request_purpose,
    ack_status_code, ack_status_message, ack_received_at,
    response_status_code, response_status_message,
    transport_undertaking_name, community_licence_number,
    vehicle_registration_number, vehicle_registration_country,
    check_result, check_date, minor_infringement, serious_infringements,
    responding_authority, response_number_of_vehicles, response_community_licence_status,
    response_address, response_penalties_imposed,
    linked_foreign_violation_form_key,
    handler_personal_code, handler_name, error_message, created_by
  )
  SELECT
    l.ncr_message_key,
    l.version + 1,
    l.direction,
    l.status,
    l.pre_forwarding_status,
    l.business_case_id,
    l.technical_id,
    l.workflow_id,
    l.sent_at,
    l.ncr_from,
    l.ncr_to,
    l.originating_authority,
    l.request_source,
    l.request_purpose,
    l.ack_status_code,
    l.ack_status_message,
    l.ack_received_at,
    l.response_status_code,
    l.response_status_message,
    l.transport_undertaking_name,
    l.community_licence_number,
    l.vehicle_registration_number,
    l.vehicle_registration_country,
    l.check_result,
    l.check_date,
    l.minor_infringement,
    l.serious_infringements,
    l.responding_authority,
    l.response_number_of_vehicles,
    l.response_community_licence_status,
    l.response_address,
    l.response_penalties_imposed,
    :foreignViolationFormKey::BIGINT,
    l.handler_personal_code,
    l.handler_name,
    l.error_message,
    :created_by
  FROM latest l
  RETURNING ncr_message_key
)
SELECT ncr_message_key FROM ins;
