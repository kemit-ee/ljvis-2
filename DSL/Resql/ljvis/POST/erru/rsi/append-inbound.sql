/*
description: "Record an INCOMING RSI (RoadSideInspection) notification arriving from another member state (LJVIS2-148). Appends the first snapshot with status 'received' and a fresh logical key from seq_rsi_message_key. Idempotent: ON CONFLICT on the partial unique index uq_rsi_inbound_technical_id (direction='incoming' AND status='received') means a redelivered RSI message yields zero rows instead of a duplicate, allowing the caller to replay the stored response. Unlike CGR, RSI carries vehicle data (not transport manager data) and the checked_items are already in ERRU format. rsi_from is the sending country from the ERRU envelope; rsi_to is always EE (us). response_status_code is NULL on receipt — it is set by the separate append-transition call that stores the 'answered' snapshot."
namespace: erru
params:
  technicalId:
    type: string
    required: false
  workflowId:
    type: string
    required: false
  sentAt:
    type: string
    required: false
  rsiFrom:
    type: string
    required: false
  businessCaseId:
    type: string
    required: false
  originatingAuthority:
    type: string
    required: false
  requestSource:
    type: string
    required: false
  requestPurpose:
    type: string
    required: false
  vehicleRegistrationNumber:
    type: string
    required: false
  vehicleRegistrationCountry:
    type: string
    required: false
  vehicleCategory:
    type: string
    required: false
  vehicleIdentificationNumber:
    type: string
    required: false
  inspectionLocation:
    type: string
    required: false
  inspectionDatetime:
    type: string
    required: false
  inspectionAuthorityOrName:
    type: string
    required: false
  inspectionPassed:
    type: string
    required: false
  ptiRequested:
    type: string
    required: false
  vehicleProhibitionOrRestriction:
    type: string
    required: false
  checkedItems:
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
*/
WITH ins AS (
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
    vehicle_registration_number,
    vehicle_registration_country,
    vehicle_category,
    vehicle_identification_number,
    inspection_location,
    inspection_datetime,
    inspection_authority_or_name,
    inspection_passed,
    pti_requested,
    vehicle_prohibition_or_restriction,
    checked_items,
    created_by
  )
  VALUES (
    nextval('erru.seq_rsi_message_key'),
    1,
    'incoming',
    'received',
    :businessCaseId,
    NULLIF(:technicalId, '')::UUID,
    NULLIF(:workflowId, '')::UUID,
    NULLIF(:sentAt, '')::TIMESTAMPTZ,
    NULLIF(:rsiFrom, ''),
    'EE',
    NULLIF(:originatingAuthority, ''),
    NULLIF(:requestSource, ''),
    NULLIF(:requestPurpose, ''),
    NULLIF(:vehicleRegistrationNumber, ''),
    NULLIF(:vehicleRegistrationCountry, ''),
    NULLIF(:vehicleCategory, ''),
    NULLIF(:vehicleIdentificationNumber, ''),
    NULLIF(:inspectionLocation, ''),
    NULLIF(:inspectionDatetime, '')::TIMESTAMPTZ,
    NULLIF(:inspectionAuthorityOrName, ''),
    NULLIF(:inspectionPassed, '')::BOOLEAN,
    NULLIF(:ptiRequested, '')::BOOLEAN,
    NULLIF(:vehicleProhibitionOrRestriction, '')::BOOLEAN,
    COALESCE(NULLIF(:checkedItems, ''), '[]')::JSONB,
    :created_by
  )
  ON CONFLICT (technical_id) WHERE (direction = 'incoming' AND status = 'received')
  DO NOTHING
  RETURNING rsi_message_key, business_case_id, version, status
)
SELECT rsi_message_key AS id, business_case_id, version, status FROM ins;
