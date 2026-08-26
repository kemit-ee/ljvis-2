/*
declaration:
  version: 0.1
  description: "Create a new OUTGOING NCR request draft (LJVIS2-63). Appends the first snapshot
    of a new erru.ncr_message with status 'initiated'. Allocates both the logical key and the
    human-readable business_case_id server-side, format NCR-EE-{year}-{seq} per LJVIS2-63 §4
    'Teate number' (e.g. NCR-EE-2026-25994) — note this differs from the country-first EE-RSI-/
    EE-CGR- convention used by the sibling ERRU families; the NCR-EE- ordering is explicit in
    the specification's own worked example and is followed verbatim. ncr_from is hardcoded EE.
    minorInfringement/seriousInfringements arrive as JSON text (already split into category +
    infringementType by the caller, per LJVIS2-63 §4 Plokk 'Rasked rikkumised ja karistused').
    Server-side data-integrity rule (LJVIS2-63 §4 'Edukalt läbitud kontroll'): when checkResult
    is Pass or CleanCheck, minorInfringement and seriousInfringements are FORCED to NULL / '[]'
    regardless of what the caller submits — this is a clearing rule, not just a display toggle."
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
WITH ins AS (
  INSERT INTO erru.ncr_message (
    ncr_message_key,
    version,
    direction,
    status,
    business_case_id,
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
    handler_personal_code,
    handler_name,
    created_by
  )
  VALUES (
    nextval('erru.seq_ncr_message_key'),
    1,
    'outgoing',
    'initiated',
    'NCR-EE-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(nextval('erru.seq_ncr_business_case_no')::text, 5, '0'),
    'EE',
    NULLIF(:ncrTo, ''),
    NULLIF(:originatingAuthority, ''),
    NULLIF(:requestSource, ''),
    NULLIF(:requestPurpose, ''),
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
  )
  RETURNING ncr_message_key, business_case_id, version, status
)
SELECT ncr_message_key AS id, business_case_id, version, status FROM ins;
