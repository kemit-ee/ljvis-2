/*
description: "Revise an OUTGOING CTUD request draft (LJVIS2-143). Appends a new snapshot with version + 1, keeping status 'initiated'. Guarded: the INSERT .. SELECT produces zero rows unless the latest snapshot is status='initiated' AND direction='outgoing', so a sent request or an inbound request can never be edited — the caller detects the empty result and returns 422. Editable fields are fully replaced from the request body (the CTUD form always submits its complete state, so a cleared field must clear); identity and envelope fields (business_case_id, ctud_from, technical_id, workflow_id, sent_at) are carried forward untouched."
namespace: erru
params:
  key:
    type: string
    required: false
  ctudTo:
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
  handlerPersonalCode:
    type: string
    required: false
  handlerName:
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
WITH latest AS (
  SELECT *
  FROM erru.ctud_request
  WHERE ctud_request_key = :key::BIGINT
  ORDER BY created_at DESC
  LIMIT 1
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
    handler_personal_code,
    handler_name,
    created_by
  )
  SELECT
    l.ctud_request_key,
    l.version + 1,
    l.direction,
    'initiated',
    l.business_case_id,
    l.technical_id,
    l.workflow_id,
    l.sent_at,
    l.ctud_from,
    NULLIF(:ctudTo, ''),
    NULLIF(:originatingAuthority, ''),
    NULLIF(:requestSource, ''),
    NULLIF(:requestPurpose, ''),
    NULLIF(:transportUndertakingName, ''),
    NULLIF(:communityLicenceNumber, ''),
    NULLIF(:vehicleRegistrationNumber, ''),
    NULLIF(:vehicleRegistrationCountry, ''),
    CASE WHEN :requestAllVehicles IN ('true', '1', 'yes') THEN true ELSE false END,
    NULLIF(:handlerPersonalCode, ''),
    NULLIF(:handlerName, ''),
    :created_by
  FROM latest l
  WHERE l.status = 'initiated'
    AND l.direction = 'outgoing'
  RETURNING ctud_request_key, business_case_id, version, status
)
SELECT ctud_request_key AS id, business_case_id, version, status FROM ins;
