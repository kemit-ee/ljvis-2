/*
description: "Apply an RSI lifecycle state transition (LJVIS2-148). Appends exactly one new snapshot iff (current status, new status, direction) is in the allowed-transition whitelist; otherwise yields zero rows and nothing is written — the caller maps that to 422 invalid_transition. RSI differs from CGR in three critical ways: (1) error is a TERMINAL outgoing state — there is no error→sent retry path; a failed message must be discarded and a brand-new one composed. (2) RSI is asynchronous — after 'sent' the response arrives later via a separate inbound-response call, so there is a distinct 'responded' status in the outgoing chain. (3) There is no resend (no sent→sent); every send attempt must start from 'initiated'. Columns not driven by the transition (vehicle data, driver data, inspection data, identification_details, checked_items) are carried forward verbatim from the latest snapshot. response_status_code/response_status_message are set only on the responded/answered transitions."
namespace: erru
params:
  key:
    type: string
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
    -- Outgoing chain: initiated -> sent (one-shot, no resend)
    ('initiated', 'sent',      'outgoing'),
    -- Asynchronous response arrives later as a separate call: sent -> responded
    ('sent',      'responded', 'outgoing'),
    -- Incoming chain: received -> answered
    ('received',  'answered',  'incoming'),
    -- error is reachable from any state in both directions; it is TERMINAL for outgoing
    -- (no error -> sent transition — a new message with a new key must be composed)
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
    -- technical_id: generate a fresh UUID on each outgoing 'sent' attempt.
    -- For all other transitions (responded, answered, error) carry the existing value.
    CASE
      WHEN l.direction = 'outgoing' AND :newStatus = 'sent' THEN gen_random_uuid()
      ELSE l.technical_id
    END,
    -- workflow_id: generated once on the first outgoing 'sent', preserved on all subsequent
    -- snapshots including the asynchronous 'responded'. For incoming messages the sender
    -- provides the workflow_id from the envelope; it is preserved unchanged.
    CASE
      WHEN :newStatus = 'sent' THEN COALESCE(l.workflow_id, gen_random_uuid())
      ELSE l.workflow_id
    END,
    CASE WHEN :newStatus = 'sent' THEN now() ELSE l.sent_at END,
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
    CASE WHEN :newStatus = 'error' THEN NULLIF(:errorMessage, '') ELSE NULL END,
    :created_by
  FROM latest l
  WHERE EXISTS (
    SELECT 1 FROM allowed a
    WHERE a.from_status = l.status
      AND a.to_status   = :newStatus
      AND a.direction   = l.direction
  )
  RETURNING rsi_message_key, business_case_id, version, status, workflow_id
)
SELECT rsi_message_key AS id, business_case_id, version, status, workflow_id FROM ins;
