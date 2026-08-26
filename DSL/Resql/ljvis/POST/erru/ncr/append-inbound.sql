/*
declaration:
  version: 0.1
  description: "Record an INCOMING NCR (NotifyCheckResult) request arriving from another
    member state (LJVIS2-64 §4.4). Appends the first snapshot with status 'received' and a
    fresh logical key from seq_ncr_message_key. Idempotent: ON CONFLICT on the partial unique
    index uq_ncr_inbound_technical_id (WHERE status='received' AND direction='incoming',
    created in Stage 9 / 20260816100000-initial-erru-ncr.sql) means a redelivered NCR message
    yields zero rows instead of a duplicate, allowing the caller to replay the stored ack.
    ncr_to is always EE (us) for incoming. minorInfringement/seriousInfringements arrive as
    JSON text, already split into category+infringementType by the caller (matching the
    request/save.yml convention) — no further transformation is done here."
  method: post
  accepts: json
  returns: json
  namespace: erru
  allowlist:
    body:
      - field: technicalId
        type: string
      - field: workflowId
        type: string
      - field: sentAt
        type: string
      - field: ncrFrom
        type: string
      - field: businessCaseId
        type: string
      - field: originatingAuthority
        type: string
      - field: requestSource
        type: string
      - field: requestPurpose
        type: string
      - field: transportUndertakingName
        type: string
      - field: communityLicenceNumber
        type: string
      - field: vehicleRegistrationNumber
        type: string
      - field: vehicleRegistrationCountry
        type: string
      - field: checkResult
        type: string
      - field: checkDate
        type: string
      - field: minorInfringement
        type: string
      - field: seriousInfringements
        type: string
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
      - field: business_case_id
        type: string
      - field: version
        type: number
      - field: status
        type: string
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
