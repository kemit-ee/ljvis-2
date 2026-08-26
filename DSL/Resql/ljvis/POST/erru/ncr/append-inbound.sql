/*
description: "Record an INCOMING NCR (NotifyCheckResult) request arriving from another member state (LJVIS2-64 §4.4). Appends the first snapshot with status 'received' and a fresh logical key from seq_ncr_message_key. Idempotent: ON CONFLICT on the partial unique index uq_ncr_inbound_technical_id (WHERE status='received' AND direction='incoming', created in Stage 9 / 20260816100000-initial-erru-ncr.sql) means a redelivered NCR message yields zero rows instead of a duplicate, allowing the caller to replay the stored ack. ncr_to is always EE (us) for incoming. minorInfringement/seriousInfringements arrive as JSON text, already split into category+infringementType by the caller (matching the request/save.yml convention) — no further transformation is done here."
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
  ncrFrom:
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
  checkResult:
    type: string
    required: false
  checkDate:
    type: string
    required: false
  minorInfringement:
    type: string
    required: false
  seriousInfringements:
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
  INSERT INTO erru.ncr_message (
    ncr_message_key,
    version,
    direction,
    status,
    business_case_id,
    technical_id,
    workflow_id,
    sent_at,
    ncr_from,
    ncr_to,
    originating_authority,
    request_source,
    request_purpose,
    transport_undertaking_name,
    community_licence_number,
    vehicle_registration_number,
    vehicle_registration_country,
    check_result,
    check_date,
    minor_infringement,
    serious_infringements,
    created_by
  )
  VALUES (
    nextval('erru.seq_ncr_message_key'),
    1,
    'incoming',
    'received',
    :businessCaseId,
    NULLIF(:technicalId, '')::UUID,
    NULLIF(:workflowId, '')::UUID,
    NULLIF(:sentAt, '')::TIMESTAMPTZ,
    NULLIF(:ncrFrom, ''),
    'EE',
    NULLIF(:originatingAuthority, ''),
    NULLIF(:requestSource, ''),
    NULLIF(:requestPurpose, ''),
    NULLIF(:transportUndertakingName, ''),
    NULLIF(:communityLicenceNumber, ''),
    NULLIF(:vehicleRegistrationNumber, ''),
    NULLIF(:vehicleRegistrationCountry, ''),
    NULLIF(:checkResult, ''),
    NULLIF(:checkDate, '')::DATE,
    NULLIF(:minorInfringement, '')::JSONB,
    COALESCE(NULLIF(:seriousInfringements, ''), '[]')::JSONB,
    :created_by
  )
  ON CONFLICT (technical_id) WHERE (direction = 'incoming' AND status = 'received')
  DO NOTHING
  RETURNING ncr_message_key, business_case_id, version, status
)
SELECT ncr_message_key AS id, business_case_id, version, status FROM ins;
