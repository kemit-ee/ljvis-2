/*
description: "Revise an OUTGOING RSI message draft (LJVIS2-147, 'täiendamine'). Appends a new snapshot with version + 1, keeping status 'initiated'. Guarded: the INSERT .. SELECT produces zero rows unless the latest snapshot is status='initiated' AND direction='outgoing', so a sent request or an inbound message can never be edited — the caller detects the empty result and returns 422. Editable fields are fully replaced from the request body; identity and envelope fields (business_case_id, rsi_from, technical_id, workflow_id, sent_at, response_status_code, response_status_message) are carried forward untouched. rsi_to is re-derived from vehicleRegistrationCountry on every revision, same as append-draft.sql."
namespace: erru
params:
  key:
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
  vehicleCategory:
    type: string
    required: false
  vehicleRegistrationNumber:
    type: string
    required: false
  vehicleRegistrationCountry:
    type: string
    required: false
  vehicleIdentificationNumber:
    type: string
    required: false
  odometerReading:
    type: string
    required: false
  driverFirstName:
    type: string
    required: false
  driverFamilyName:
    type: string
    required: false
  driverLicenceNumber:
    type: string
    required: false
  driverLicenceCountry:
    type: string
    required: false
  identificationDetails:
    type: string
    required: false
  inspectionIdentifier:
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
  FROM erru.rsi_message
  WHERE rsi_message_key = :key::BIGINT
  ORDER BY created_at DESC
  LIMIT 1
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
    created_by
  )
  SELECT
    l.rsi_message_key,
    l.version + 1,
    l.direction,
    'initiated',
    l.business_case_id,
    l.technical_id,
    l.workflow_id,
    l.sent_at,
    l.rsi_from,
    NULLIF(:vehicleRegistrationCountry, ''),
    NULLIF(:originatingAuthority, ''),
    NULLIF(:requestSource, ''),
    NULLIF(:requestPurpose, ''),
    NULLIF(:vehicleCategory, ''),
    NULLIF(:vehicleRegistrationNumber, ''),
    NULLIF(:vehicleRegistrationCountry, ''),
    NULLIF(:vehicleIdentificationNumber, ''),
    NULLIF(:odometerReading, '')::INTEGER,
    NULLIF(:driverFirstName, ''),
    NULLIF(:driverFamilyName, ''),
    NULLIF(:driverLicenceNumber, ''),
    NULLIF(:driverLicenceCountry, ''),
    NULLIF(:identificationDetails, '')::JSONB,
    NULLIF(:inspectionIdentifier, ''),
    NULLIF(:inspectionLocation, ''),
    NULLIF(:inspectionDatetime, '')::TIMESTAMPTZ,
    NULLIF(:inspectionAuthorityOrName, ''),
    NULLIF(:inspectionPassed, '')::BOOLEAN,
    NULLIF(:ptiRequested, '')::BOOLEAN,
    NULLIF(:vehicleProhibitionOrRestriction, '')::BOOLEAN,
    COALESCE(NULLIF(:checkedItems, ''), '[]')::JSONB,
    l.response_status_code,
    l.response_status_message,
    NULLIF(:handlerPersonalCode, ''),
    NULLIF(:handlerName, ''),
    :created_by
  FROM latest l
  WHERE l.status = 'initiated'
    AND l.direction = 'outgoing'
  RETURNING rsi_message_key, business_case_id, version, status
)
SELECT rsi_message_key AS id, business_case_id, version, status FROM ins;
