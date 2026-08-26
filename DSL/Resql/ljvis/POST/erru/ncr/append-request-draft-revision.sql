/*
declaration:
  version: 0.1
  description: "Revise an OUTGOING NCR request draft (LJVIS2-63, 'täiendamine'). Appends a new
    snapshot with version + 1, keeping status 'initiated'. Guarded: the INSERT .. SELECT
    produces zero rows unless the latest snapshot is status='initiated' AND direction='outgoing',
    so a sent/acknowledged/responded request can never be edited — the caller detects the empty
    result and returns 422 not_editable. Identity/envelope fields (business_case_id, ncr_from,
    technical_id, workflow_id, sent_at, ack_*, response_*) are carried forward untouched. Same
    Pass/CleanCheck clearing rule as append-request-draft.sql applies on every revision."
  method: post
  accepts: json
  returns: json
  namespace: erru
  allowlist:
    body:
      - field: businessCaseId
        type: string
      - field: originatingAuthority
        type: string
      - field: requestSource
        type: string
      - field: requestPurpose
        type: string
      - field: ncrTo
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
      - field: handlerPersonalCode
        type: string
      - field: handlerName
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
WITH latest AS (
  SELECT *
  FROM erru.ncr_message
  WHERE business_case_id = :businessCaseId
  ORDER BY created_at DESC
  LIMIT 1
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
    handler_personal_code, handler_name, created_by
  )
  SELECT
    l.ncr_message_key,
    l.version + 1,
    l.direction,
    'initiated',
    l.business_case_id,
    l.technical_id,
    l.workflow_id,
    l.sent_at,
    l.ncr_from,
    NULLIF(:ncrTo, ''),
    NULLIF(:originatingAuthority, ''),
    NULLIF(:requestSource, ''),
    NULLIF(:requestPurpose, ''),
    l.ack_status_code,
    l.ack_status_message,
    l.ack_received_at,
    l.response_status_code,
    l.response_status_message,
    NULLIF(:transportUndertakingName, ''),
    NULLIF(:communityLicenceNumber, ''),
    NULLIF(:vehicleRegistrationNumber, ''),
    NULLIF(:vehicleRegistrationCountry, ''),
    NULLIF(:checkResult, ''),
    NULLIF(:checkDate, '')::DATE,
    CASE WHEN :checkResult IN ('Pass', 'CleanCheck') THEN NULL ELSE NULLIF(:minorInfringement, '')::JSONB END,
    CASE WHEN :checkResult IN ('Pass', 'CleanCheck') THEN '[]'::JSONB ELSE COALESCE(NULLIF(:seriousInfringements, ''), '[]')::JSONB END,
    NULLIF(:handlerPersonalCode, ''),
    NULLIF(:handlerName, ''),
    :created_by
  FROM latest l
  WHERE l.status = 'initiated'
    AND l.direction = 'outgoing'
  RETURNING ncr_message_key, business_case_id, version, status
)
SELECT ncr_message_key AS id, business_case_id, version, status FROM ins;
