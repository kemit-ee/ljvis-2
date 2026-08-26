/*
description: "Record an INCOMING CTUD request arriving from another member state (LJVIS2-144). Appends the first snapshot with status 'received' and a fresh logical key. Idempotent: ON CONFLICT on the partial unique index uq_ctud_inbound_technical_id means a redelivered ERRU message yields zero rows instead of a duplicate request, so the caller can detect the replay and return the previously produced response. business_case_id is stored verbatim as sent by the peer, and sent_at comes from the message header rather than the clock."
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
  ctudFrom:
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
  transportUndertakingName:
    type: string
    required: false
  communityLicenceNumber:
    type: string
    required: false
  vehicleRegistrationNumber:
    type: string
    required: false
  vehicleRegistrationCountry:
    type: string
    required: false
  requestAllVehicles:
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
    created_by
  )
  VALUES (
    nextval('erru.seq_ctud_request_key'),
    1,
    'incoming',
    'received',
    :businessCaseId,
    NULLIF(:technicalId, '')::UUID,
    NULLIF(:workflowId, '')::UUID,
    NULLIF(:sentAt, '')::TIMESTAMPTZ,
    NULLIF(:ctudFrom, ''),
    'EE',
    NULLIF(:originatingAuthority, ''),
    NULLIF(:requestSource, ''),
    NULLIF(:requestPurpose, ''),
    NULLIF(:transportUndertakingName, ''),
    NULLIF(:communityLicenceNumber, ''),
    NULLIF(:vehicleRegistrationNumber, ''),
    NULLIF(:vehicleRegistrationCountry, ''),
    CASE WHEN :requestAllVehicles IN ('true', '1', 'yes') THEN true ELSE false END,
    :created_by
  )
  ON CONFLICT (technical_id) WHERE (direction = 'incoming' AND status = 'received')
  DO NOTHING
  RETURNING ctud_request_key, business_case_id, version, status
)
SELECT ctud_request_key AS id, business_case_id, version, status FROM ins;
