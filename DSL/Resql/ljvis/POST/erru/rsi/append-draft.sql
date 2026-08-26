/*
declaration:
  version: 0.1
  description: "Create a new OUTGOING RSI message draft (LJVIS2-147), including pre-filling from a published negative technical-check card (LJVIS2-148 §4.1 — the caller pre-fills vehicle/inspection/identification fields before calling this same query, there is no separate build query). Appends the first snapshot of a new erru.rsi_message with status 'initiated'. Allocates both the logical key and the human-readable business_case_id (EE-RSI-AAAA-NNNNN) server-side. rsi_from is hardcoded to EE; rsi_to is derived from vehicleRegistrationCountry (LJVIS2-147 §Plokk 'Sõiduki andmed'). identification_details/checked_items arrive as JSON text and are cast to jsonb verbatim."
  method: post
  accepts: json
  returns: json
  namespace: erru
  allowlist:
    body:
      - field: originatingAuthority
        type: string
      - field: requestSource
        type: string
      - field: requestPurpose
        type: string
      - field: vehicleCategory
        type: string
      - field: vehicleRegistrationNumber
        type: string
      - field: vehicleRegistrationCountry
        type: string
      - field: vehicleIdentificationNumber
        type: string
      - field: odometerReading
        type: string
      - field: driverFirstName
        type: string
      - field: driverFamilyName
        type: string
      - field: driverLicenceNumber
        type: string
      - field: driverLicenceCountry
        type: string
      - field: identificationDetails
        type: string
      - field: inspectionIdentifier
        type: string
      - field: inspectionLocation
        type: string
      - field: inspectionDatetime
        type: string
      - field: inspectionAuthorityOrName
        type: string
      - field: inspectionPassed
        type: string
      - field: ptiRequested
        type: string
      - field: vehicleProhibitionOrRestriction
        type: string
      - field: checkedItems
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
  INSERT INTO erru.rsi_message (
    rsi_message_key,
    version,
    direction,
    status,
    business_case_id,
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
    handler_personal_code,
    handler_name,
    created_by
  )
  VALUES (
    nextval('erru.seq_rsi_message_key'),
    1,
    'outgoing',
    'initiated',
    'EE-RSI-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(nextval('erru.seq_rsi_business_case_no')::text, 5, '0'),
    'EE',
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
    NULLIF(:handlerPersonalCode, ''),
    NULLIF(:handlerName, ''),
    :created_by
  )
  RETURNING rsi_message_key, business_case_id, version, status
)
SELECT rsi_message_key AS id, business_case_id, version, status FROM ins;
