/*
declaration:
  version: 0.1
  description: "Create a new OUTGOING CTUD request draft (LJVIS2-143). Appends the first snapshot of a new erru.ctud_request with status 'initiated'. Allocates both the logical key and the human-readable business_case_id (CTUD-EE-AAAA-NNNNN) server-side — neither is ever taken from the client. ctud_from is hardcoded to EE because an outgoing request is by definition issued by Estonia. status and direction are hardcoded here, never accepted from the caller."
  method: post
  accepts: json
  returns: json
  namespace: erru
  allowlist:
    body:
      - field: ctudTo
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
      - field: requestAllVehicles
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
WITH ins AS (
  INSERT INTO erru.ctud_request (
    ctud_request_key,
    version,
    direction,
    status,
    business_case_id,
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
  VALUES (
    nextval('erru.seq_ctud_request_key'),
    1,
    'outgoing',
    'initiated',
    'CTUD-EE-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(nextval('erru.seq_ctud_business_case_no')::text, 5, '0'),
    'EE',
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
  )
  RETURNING ctud_request_key, business_case_id, version, status
)
SELECT ctud_request_key AS id, business_case_id, version, status FROM ins;
