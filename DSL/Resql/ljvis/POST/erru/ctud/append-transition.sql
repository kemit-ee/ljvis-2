/*
description: 'Apply a CTUD lifecycle state transition (LJVIS2-142). Appends exactly one new snapshot iff
  (current status, new status, direction) is in the allowed-transition whitelist; otherwise the INSERT
  .. SELECT yields zero rows and nothing is written at all, which is what the specification requires of
  a rejected transition. The caller detects the empty result and returns 422 invalid_transition. Atomic
  by construction: the guard is evaluated inside the same statement as the insert, so a concurrent double
  transition cannot slip through.'
namespace: erru
params:
  key:
    type: integer
    required: false
  newStatus:
    type: string
    required: false
  technicalId:
    type: string
    required: false
  workflowId:
    type: string
    required: false
  respondingAuthority:
    type: string
    required: false
  responseStatusCode:
    type: string
    required: false
  responseStatusMessage:
    type: string
    required: false
  responseContent:
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
- name: response_status_code
  type: string
  nullable: true
*/
WITH latest AS (
  SELECT *
  FROM erru.ctud_request
  WHERE ctud_request_key = :key::BIGINT
  ORDER BY created_at DESC
  LIMIT 1
), allowed (from_status, to_status, direction) AS (
  VALUES
    -- Outgoing chain: initiated|error -> sending (erru.ctud_begin_send, before any network I/O)
    -- -> sent (Hub HTTP 202) -> responded (asynchronous CheckTransportUndertakingData_Response).
    ('sending',      'sent',         'outgoing'),
    ('sending',      'send_unknown', 'outgoing'),
    ('sending',      'error',        'outgoing'),
    -- A response may beat the Hub acknowledgement or follow an uncertain dispatch.
    ('sending',      'responded',    'outgoing'),
    ('send_unknown', 'responded',    'outgoing'),
    ('sent',         'responded',    'outgoing'),
    -- The retry after a definite rejection is reserved by erru.ctud_begin_send (error -> sending).
    -- Incoming chain: received -> answered
    ('received',  'answered',  'incoming'),
    -- error is reachable from every state, in both directions
    ('initiated', 'error',     'outgoing'),
    ('sent',      'error',     'outgoing'),
    ('responded', 'error',     'outgoing'),
    ('received',  'error',     'incoming'),
    ('answered',  'error',     'incoming')
), ins AS (
  INSERT INTO erru.ctud_request (
    ctud_request_key,
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
    response_content,
    handler_personal_code,
    handler_name,
    error_message,
    created_by
  )
  SELECT
    l.ctud_request_key,
    l.version + 1,
    l.direction,
    :newStatus,
    l.business_case_id,
    -- The reservation owns the envelope. Explicit values apply only to incoming snapshots.
    CASE WHEN l.direction = 'incoming' AND NULLIF(:technicalId, '') IS NOT NULL THEN NULLIF(:technicalId, '')::UUID ELSE l.technical_id END,
    CASE WHEN l.direction = 'incoming' AND NULLIF(:workflowId, '') IS NOT NULL THEN NULLIF(:workflowId, '')::UUID ELSE l.workflow_id END,
    l.sent_at,
    l.ctud_from,
    l.ctud_to,
    l.originating_authority,
    l.request_source,
    l.request_purpose,
    l.transport_undertaking_name,
    l.community_licence_number,
    l.vehicle_registration_number,
    l.vehicle_registration_country,
    l.request_all_vehicles,
    COALESCE(NULLIF(:respondingAuthority, ''), l.responding_authority),
    COALESCE(NULLIF(:responseStatusCode, ''), l.response_status_code),
    COALESCE(NULLIF(:responseStatusMessage, ''), l.response_status_message),
    COALESCE(NULLIF(:responseContent, '')::JSONB, l.response_content),
    l.handler_personal_code,
    l.handler_name,
    -- error_message is meaningful only for the error state; clear it on any recovery
    CASE WHEN :newStatus IN ('error','send_unknown') THEN NULLIF(:errorMessage, '') ELSE NULL END,
    :created_by
  FROM latest l
  WHERE EXISTS (
    SELECT 1 FROM allowed a
    WHERE a.from_status = l.status
      AND a.to_status   = :newStatus
      AND a.direction   = l.direction
  )
  RETURNING ctud_request_key, business_case_id, version, status, response_status_code
)
SELECT ctud_request_key AS id, business_case_id, version, status, response_status_code FROM ins;
