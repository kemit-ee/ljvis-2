/*
description: 'Append an RSI lifecycle snapshot. begin-send reserves sending and persists the envelope.
  Hub HTTP 202 changes sending to sent. Unknown transport outcomes become send_unknown and cannot
  be retried. A correlated response can complete sending, sent or send_unknown. Incoming requests
  keep the received to answered chain. Never replace the reserved technical_id or workflow_id.'
namespace: erru
params:
  key:
    type: integer
    required: false
  newStatus:
    type: string
    required: false
  responseStatusCode:
    type: string
    required: false
  responseStatusMessage:
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
  FROM erru.rsi_message
  WHERE rsi_message_key = :key::BIGINT
  ORDER BY created_at DESC
  LIMIT 1
), allowed (from_status, to_status, direction) AS (
  VALUES
    -- Sending is reserved by rsi_begin_send before any network I/O.
    ('sending',   'sent',      'outgoing'),
    ('sending',   'send_unknown', 'outgoing'),
    ('sending',   'error',     'outgoing'),
    ('sending',   'responded', 'outgoing'),
    ('send_unknown', 'responded', 'outgoing'),
    -- Asynchronous response arrives later as a separate call: sent -> responded
    ('sent',      'responded', 'outgoing'),
    -- Incoming chain: received -> answered
    ('received',  'answered',  'incoming'),
    -- error is reachable from any state in both directions; it is TERMINAL for outgoing
    -- (no error -> sent transition - a new message with a new key must be composed)
    ('initiated', 'error',     'outgoing'),
    ('sent',      'error',     'outgoing'),
    ('received',  'error',     'incoming'),
    ('answered',  'error',     'incoming')
), ins AS (
  INSERT INTO erru.rsi_message (
    rsi_message_key,
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
    identification_details,
    inspection_identifier,
    inspection_location,
    inspection_datetime,
    inspection_authority_or_name,
    inspection_passed,
    pti_requested,
    vehicle_prohibition_or_restriction,
    checked_items,
    response_status_code,
    response_status_message,
    handler_personal_code,
    handler_name,
    error_message,
    created_by
  )
  SELECT
    l.rsi_message_key,
    l.version + 1,
    l.direction,
    :newStatus,
    l.business_case_id,
    -- The reservation owns the envelope. Never replace correlation identifiers here.
    l.technical_id,
    l.workflow_id,
    l.sent_at,
    l.rsi_from,
    l.rsi_to,
    l.originating_authority,
    l.request_source,
    l.request_purpose,
    -- Vehicle and inspection data are immutable across lifecycle snapshots
    l.vehicle_category,
    l.vehicle_registration_number,
    l.vehicle_registration_country,
    l.vehicle_identification_number,
    l.odometer_reading,
    l.driver_first_name,
    l.driver_family_name,
    l.driver_licence_number,
    l.driver_licence_country,
    l.identification_details,
    l.inspection_identifier,
    l.inspection_location,
    l.inspection_datetime,
    l.inspection_authority_or_name,
    l.inspection_passed,
    l.pti_requested,
    l.vehicle_prohibition_or_restriction,
    l.checked_items,
    -- response_status_code/message: set only on responded (outgoing) and answered (incoming);
    -- cleared on all other transitions (initiated, sent) where no response exists yet.
    CASE
      WHEN :newStatus IN ('responded', 'answered') THEN NULLIF(:responseStatusCode, '')
      ELSE NULL
    END,
    CASE
      WHEN :newStatus IN ('responded', 'answered') THEN NULLIF(:responseStatusMessage, '')
      ELSE NULL
    END,
    l.handler_personal_code,
    l.handler_name,
    -- error_message is meaningful only for the error state
    CASE WHEN :newStatus IN ('error','send_unknown') THEN NULLIF(:errorMessage, '') ELSE NULL END,
    :created_by
  FROM latest l
  WHERE EXISTS (
    SELECT 1 FROM allowed a
    WHERE a.from_status = l.status
      AND a.to_status   = :newStatus
      AND a.direction   = l.direction
  )
  ON CONFLICT (technical_id) WHERE direction = 'incoming' AND status = 'answered' DO NOTHING
  RETURNING rsi_message_key, business_case_id, version, status, workflow_id
)
SELECT rsi_message_key AS id, business_case_id, version, status, workflow_id FROM ins;
