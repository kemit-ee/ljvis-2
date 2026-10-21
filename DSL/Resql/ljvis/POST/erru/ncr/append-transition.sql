/*
description: 'Apply an NCR lifecycle state transition (LJVIS2-64). Appends exactly one new snapshot iff
  (current status, new status, direction) is in the allowed-transition whitelist; otherwise yields zero
  rows and nothing is written - the caller maps that to 422 not_sendable / invalid_transition. Unlike
  RSI, NCR''s error state is NOT terminal: a failed send can be retried (outgoing: erru.ncr_begin_send,
  incoming response: erru.ncr_begin_response, both reserve the envelope and move to sending), per LJVIS2-62 §4
  ''Viga olekus saab teate või vastuse uuesti saata''. The Hub outcome (sending -> sent | send_unknown | error,
  incoming sending -> answered), the asynchronous acknowledgement (-> acknowledged) and the substantive
  response (-> responded) are separate transitions. The envelope identifiers belong to the reservation and
  are never set here. Columns not driven by the transition (transport undertaking, vehicle, infringements,
  response content) are carried forward verbatim from the latest snapshot.'
namespace: erru
params:
  businessCaseId:
    type: string
    required: false
  newStatus:
    type: string
    required: false
  ackStatusCode:
    type: string
    required: false
  ackStatusMessage:
    type: string
    required: false
  respondingAuthority:
    type: string
    required: false
  transportUndertakingName:
    type: string
    required: false
  responseStatusCode:
    type: string
    required: false
  responseStatusMessage:
    type: string
    required: false
  responseNumberOfVehicles:
    type: string
    required: false
  responseCommunityLicenceStatus:
    type: string
    required: false
  responseAddress:
    type: string
    required: false
  responsePenaltiesImposed:
    type: string
    required: false
  errorMessage:
    type: string
    required: false
  created_by:
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
- name: workflow_id
  type: string
  nullable: true
*/
WITH latest AS (
  SELECT *
  FROM erru.ncr_message
  WHERE business_case_id = :businessCaseId
  ORDER BY created_at DESC
  LIMIT 1
), allowed (from_status, to_status, direction) AS (
  VALUES
    -- Outgoing: sending is reserved by erru.ncr_begin_send before any network I/O.
    ('sending',      'sent',         'outgoing'),
    ('sending',      'send_unknown', 'outgoing'),
    ('sending',      'error',        'outgoing'),
    -- NotifyCheckResult_Acknowledgement may beat the Hub HTTP answer or follow an uncertain dispatch.
    ('sending',      'acknowledged', 'outgoing'),
    ('send_unknown', 'acknowledged', 'outgoing'),
    ('sent',         'acknowledged', 'outgoing'),
    -- Asynchronous substantive response, correlated by workflowId (inbound-response.yml); it can
    -- also overtake the acknowledgement.
    ('acknowledged', 'responded',    'outgoing'),
    ('sent',         'responded',    'outgoing'),
    ('sending',      'responded',    'outgoing'),
    ('send_unknown', 'responded',    'outgoing'),
    -- Incoming response: answer_drafted|error -> sending is reserved by erru.ncr_begin_response.
    ('sending',      'answered',     'incoming'),
    ('sending',      'send_unknown', 'incoming'),
    ('sending',      'error',        'incoming'),
    -- A negative NCRR_Ack for a response we sent.
    ('answered',     'error',        'incoming'),
    -- error is reachable from any non-terminal state, both directions
    ('initiated',     'error',      'outgoing'),
    ('sent',          'error',      'outgoing'),
    ('send_unknown',  'error',      'outgoing'),
    ('acknowledged',  'error',      'outgoing'),
    ('answer_drafted','error',      'incoming'),
    -- a retry from error that fails again is logged as its own snapshot too
    ('error',         'error',      'outgoing'),
    ('error',         'error',      'incoming')
), ins AS (
  INSERT INTO erru.ncr_message (
    ncr_message_key, version, direction, status,
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
    :newStatus,
    l.business_case_id,
    -- The reservation owns the envelope. Never replace correlation identifiers here.
    l.technical_id,
    l.workflow_id,
    l.sent_at,
    l.ncr_from,
    l.ncr_to,
    l.originating_authority,
    l.request_source,
    l.request_purpose,
    CASE WHEN :newStatus = 'acknowledged' THEN NULLIF(:ackStatusCode, '') ELSE l.ack_status_code END,
    CASE WHEN :newStatus = 'acknowledged' THEN NULLIF(:ackStatusMessage, '') ELSE l.ack_status_message END,
    CASE WHEN :newStatus = 'acknowledged' THEN now() ELSE l.ack_received_at END,
    -- response content is written only on the substantive 'responded' transition
    -- (outgoing flow) - all other transitions carry the existing values forward.
    CASE WHEN :newStatus = 'responded' THEN NULLIF(:responseStatusCode, '') ELSE l.response_status_code END,
    CASE WHEN :newStatus = 'responded' THEN NULLIF(:responseStatusMessage, '') ELSE l.response_status_message END,
    CASE WHEN :newStatus = 'responded' AND NULLIF(:transportUndertakingName, '') IS NOT NULL
         THEN :transportUndertakingName ELSE l.transport_undertaking_name END,
    l.community_licence_number,
    l.vehicle_registration_number,
    l.vehicle_registration_country,
    l.check_result,
    l.check_date,
    l.minor_infringement,
    l.serious_infringements,
    CASE WHEN :newStatus = 'responded' THEN NULLIF(:respondingAuthority, '') ELSE l.responding_authority END,
    CASE WHEN :newStatus = 'responded' THEN NULLIF(:responseNumberOfVehicles, '')::INTEGER ELSE l.response_number_of_vehicles END,
    CASE WHEN :newStatus = 'responded' THEN NULLIF(:responseCommunityLicenceStatus, '') ELSE l.response_community_licence_status END,
    CASE WHEN :newStatus = 'responded' THEN NULLIF(:responseAddress, '')::JSONB ELSE l.response_address END,
    CASE WHEN :newStatus = 'responded' THEN COALESCE(NULLIF(:responsePenaltiesImposed, ''), '[]')::JSONB ELSE l.response_penalties_imposed END,
    l.linked_foreign_violation_form_key,
    l.handler_personal_code,
    l.handler_name,
    CASE WHEN :newStatus IN ('error','send_unknown') THEN NULLIF(:errorMessage, '') ELSE NULL END,
    :created_by
  FROM latest l
  WHERE EXISTS (
    SELECT 1 FROM allowed a
    WHERE a.from_status = l.status
      AND a.to_status   = :newStatus
      AND a.direction   = l.direction
  )
  RETURNING ncr_message_key, business_case_id, version, status, workflow_id
)
SELECT ncr_message_key AS id, business_case_id, version, status, workflow_id FROM ins;
