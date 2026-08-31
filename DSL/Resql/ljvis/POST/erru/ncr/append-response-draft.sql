/*
declaration:
  version: 0.1
  description: "Save/revise the Estonian RESPONSE draft to an INCOMING NCR message (LJVIS2-63).
    Appends a new snapshot with status 'answer_drafted', keeping all request-side fields
    (transport undertaking, infringements, etc.) carried forward unchanged — only the response
    block and version/status advance. Guarded: the INSERT .. SELECT produces zero rows unless
    the latest snapshot is status IN ('viewed', 'answer_drafted') AND direction='incoming' — a
    not-yet-opened (received), already-answered, or outgoing message cannot be 'responded to'
    via this endpoint; the caller detects the empty result and returns 422 not_editable.
    penaltiesImposed[] completeness (every penaltyRequestedIdentifier from the request covered
    exactly once) is validated by the CALLER (response/save.yml) before this query runs — this
    query trusts the caller's payload and does not re-derive coverage. isImposed=false rows are
    expected to already have penaltyTypeImposed/startDate/endDate stripped by the caller."
  method: post
  accepts: json
  returns: json
  namespace: erru
  allowlist:
    body:
      - field: businessCaseId
        type: string
      - field: respondingAuthority
        type: string
      - field: responseStatusCode
        type: string
      - field: responseStatusMessage
        type: string
      - field: responseNumberOfVehicles
        type: string
      - field: responseCommunityLicenceStatus
        type: string
      - field: responseAddress
        type: string
      - field: responsePenaltiesImposed
        type: string
      - field: transportUndertakingName
        type: string
      - field: communityLicenceNumber
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
    transport_undertaking_name, community_licence_number,
    vehicle_registration_number, vehicle_registration_country,
    check_result, check_date, minor_infringement, serious_infringements,
    responding_authority, response_status_code, response_status_message,
    response_number_of_vehicles, response_community_licence_status, response_address,
    response_penalties_imposed,
    linked_foreign_violation_form_key,
    handler_personal_code, handler_name, created_by
  )
  SELECT
    l.ncr_message_key,
    l.version + 1,
    l.direction,
    'answer_drafted',
    l.business_case_id,
    l.technical_id,
    l.workflow_id,
    l.sent_at,
    l.ncr_from,
    l.ncr_to,
    l.originating_authority,
    l.request_source,
    l.request_purpose,
    l.ack_status_code,
    l.ack_status_message,
    l.ack_received_at,
    COALESCE(NULLIF(:transportUndertakingName, ''), l.transport_undertaking_name),
    COALESCE(NULLIF(:communityLicenceNumber, ''), l.community_licence_number),
    l.vehicle_registration_number,
    l.vehicle_registration_country,
    l.check_result,
    l.check_date,
    l.minor_infringement,
    l.serious_infringements,
    NULLIF(:respondingAuthority, ''),
    NULLIF(:responseStatusCode, ''),
    NULLIF(:responseStatusMessage, ''),
    NULLIF(:responseNumberOfVehicles, '')::INTEGER,
    NULLIF(:responseCommunityLicenceStatus, ''),
    NULLIF(:responseAddress, '')::JSONB,
    COALESCE(NULLIF(:responsePenaltiesImposed, ''), '[]')::JSONB,
    l.linked_foreign_violation_form_key,
    NULLIF(:handlerPersonalCode, ''),
    NULLIF(:handlerName, ''),
    :created_by
  FROM latest l
  WHERE l.status IN ('viewed', 'answer_drafted')
    AND l.direction = 'incoming'
  RETURNING ncr_message_key, business_case_id, version, status
)
SELECT ncr_message_key AS id, business_case_id, version, status FROM ins;
