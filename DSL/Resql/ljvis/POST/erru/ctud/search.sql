/*
declaration:
  version: 0.1
  description: "Paginated, filtered list of CTUD requests, both directions in one table (LJVIS2-145). The `latest` CTE reduces the append-only table to exactly one row per request (the newest snapshot) before any filtering or paging, so a request with ten snapshots still occupies one list row. All filters are optional and AND-combined, except the three search-criteria fields (undertaking name, community licence number, vehicle registration number) which are OR-combined with each other and then AND-combined with the rest. Sorting is whitelisted; total is returned via COUNT(*) OVER () so the caller needs only one round trip."
  method: post
  accepts: json
  returns: json
  namespace: erru
  allowlist:
    body:
      - field: businessCaseId
        type: string
      - field: sentFrom
        type: string
      - field: sentUntil
        type: string
      - field: ctudFrom
        type: string
      - field: ctudTo
        type: string
      - field: transportUndertakingName
        type: string
      - field: communityLicenceNumber
        type: string
      - field: vehicleRegistrationNumber
        type: string
      - field: handlerPersonalCode
        type: string
      - field: status
        type: string
      - field: direction
        type: string
      - field: sorting
        type: string
      - field: page
        type: string
      - field: page_size
        type: string
  response:
    fields:
      - field: id
        type: number
      - field: version
        type: number
      - field: direction
        type: string
      - field: status
        type: string
      - field: business_case_id
        type: string
      - field: sent_at
        type: string
      - field: ctud_from
        type: string
      - field: ctud_to
        type: string
      - field: transport_undertaking_name
        type: string
      - field: community_licence_number
        type: string
      - field: vehicle_registration_number
        type: string
      - field: response_status_code
        type: string
      - field: handler_personal_code
        type: string
      - field: handler_name
        type: string
      - field: total
        type: number
*/
WITH latest AS (
  SELECT DISTINCT ON (ctud_request_key)
    ctud_request_key,
    version,
    direction,
    status,
    business_case_id,
    sent_at,
    ctud_from,
    ctud_to,
    transport_undertaking_name,
    community_licence_number,
    vehicle_registration_number,
    response_status_code,
    handler_personal_code,
    handler_name
  FROM erru.ctud_request
  ORDER BY ctud_request_key, created_at DESC
)
SELECT
  l.ctud_request_key AS id,
  l.version,
  l.direction,
  l.status,
  l.business_case_id,
  l.sent_at,
  l.ctud_from,
  l.ctud_to,
  l.transport_undertaking_name,
  l.community_licence_number,
  l.vehicle_registration_number,
  l.response_status_code,
  l.handler_personal_code,
  l.handler_name,
  (COUNT(*) OVER ())::INTEGER AS total
FROM latest l
WHERE (COALESCE(:businessCaseId, '') = '' OR l.business_case_id ILIKE '%' || :businessCaseId || '%')
  AND (COALESCE(:sentFrom, '') = '' OR l.sent_at >= (:sentFrom)::DATE)
  -- upper bound is inclusive of the whole day, hence < day + 1
  AND (COALESCE(:sentUntil, '') = '' OR l.sent_at < ((:sentUntil)::DATE + INTERVAL '1 day'))
  AND (COALESCE(:ctudFrom, '') = '' OR l.ctud_from = :ctudFrom)
  AND (COALESCE(:ctudTo, '') = '' OR l.ctud_to = :ctudTo)
  AND (COALESCE(:handlerPersonalCode, '') = '' OR l.handler_personal_code = :handlerPersonalCode)
  AND (COALESCE(:status, '') = '' OR l.status = :status)
  AND (COALESCE(:direction, '') = '' OR l.direction = :direction)
  -- OR-group: each term is guarded by its own non-empty check, otherwise an empty
  -- filter would degrade to ILIKE '%%' and match every row.
  AND (
    (COALESCE(:transportUndertakingName, '') = ''
      AND COALESCE(:communityLicenceNumber, '') = ''
      AND COALESCE(:vehicleRegistrationNumber, '') = '')
    OR (COALESCE(:transportUndertakingName, '') <> ''
      AND l.transport_undertaking_name ILIKE '%' || :transportUndertakingName || '%')
    OR (COALESCE(:communityLicenceNumber, '') <> ''
      AND l.community_licence_number ILIKE '%' || :communityLicenceNumber || '%')
    OR (COALESCE(:vehicleRegistrationNumber, '') <> ''
      AND l.vehicle_registration_number ILIKE '%' || :vehicleRegistrationNumber || '%')
  )
ORDER BY
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'business_case_id asc'  THEN l.business_case_id END ASC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'business_case_id desc' THEN l.business_case_id END DESC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'sent_at asc'           THEN l.sent_at END ASC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'sent_at desc'          THEN l.sent_at END DESC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'ctud_from asc'         THEN l.ctud_from END ASC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'ctud_from desc'        THEN l.ctud_from END DESC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'ctud_to asc'           THEN l.ctud_to END ASC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'ctud_to desc'          THEN l.ctud_to END DESC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'transport_undertaking_name asc'  THEN l.transport_undertaking_name COLLATE "et-EE-x-icu" END ASC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'transport_undertaking_name desc' THEN l.transport_undertaking_name COLLATE "et-EE-x-icu" END DESC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'status asc'            THEN l.status END ASC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'status desc'           THEN l.status END DESC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'handler_name asc'      THEN l.handler_name COLLATE "et-EE-x-icu" END ASC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'handler_name desc'     THEN l.handler_name COLLATE "et-EE-x-icu" END DESC,
  -- deterministic tiebreaker: without it LIMIT/OFFSET paging can repeat or skip rows
  l.ctud_request_key DESC
LIMIT COALESCE(NULLIF(:page_size, ''), '20')::INTEGER
OFFSET ((GREATEST(COALESCE(NULLIF(:page, ''), '1')::INTEGER, 1) - 1) * COALESCE(NULLIF(:page_size, ''), '20')::INTEGER);
