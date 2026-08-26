/*
description: "Automatic received -> viewed transition (LJVIS2-62 §4 üleminekute tabel: 'Saabunud -> Vaadatud | Menetleja avab juhtumi | Käsitsi'). Triggered as a side effect of the first GET /v1/erru/ncr/get.yml open of an incoming case, per LJVIS2-63 §4 'Teate esmakordsel avamisel liigub teade olekusse Vaadatud'. Guarded: the INSERT .. SELECT produces zero rows unless the latest snapshot is status='received' AND direction='incoming', so opening an already-viewed (or outgoing, or terminal) case is a harmless no-op — the caller simply keeps using the already-fetched snapshot. All fields are carried forward unchanged; created_by is 'system' since this transition has no human actor (LJVIS2-62 §Testimine: 'automaatsel üleminekul on actorPersonalCode väärtus null')."
namespace: erru
params:
  businessCaseId:
    type: string
    required: false
returns:
  - name: id
    type: number
    nullable: true
  - name: business_case_id
    type: string
    nullable: true
  - name: version
    type: number
    nullable: true
  - name: status
    type: string
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
    response_penalties_imposed, responding_authority, response_number_of_vehicles,
    response_community_licence_status, response_address,
    linked_foreign_violation_form_key, handler_personal_code, handler_name, created_by
  )
  SELECT
    l.ncr_message_key, l.version + 1, l.direction, 'viewed', NULL,
    l.business_case_id, l.technical_id, l.workflow_id, l.sent_at, l.ncr_from, l.ncr_to,
    l.originating_authority, l.request_source, l.request_purpose,
    l.ack_status_code, l.ack_status_message, l.ack_received_at,
    l.response_status_code, l.response_status_message,
    l.transport_undertaking_name, l.community_licence_number,
    l.vehicle_registration_number, l.vehicle_registration_country,
    l.check_result, l.check_date, l.minor_infringement, l.serious_infringements,
    l.response_penalties_imposed, l.responding_authority, l.response_number_of_vehicles,
    l.response_community_licence_status, l.response_address,
    l.linked_foreign_violation_form_key, l.handler_personal_code, l.handler_name, 'system'
  FROM latest l
  WHERE l.status = 'received'
    AND l.direction = 'incoming'
  RETURNING ncr_message_key, business_case_id, version, status
)
SELECT ncr_message_key AS id, business_case_id, version, status FROM ins;
