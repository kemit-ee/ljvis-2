/*
description: "Paginated, filtered list of RSI messages — BOTH incoming and outgoing (LJVIS2-149). Unlike the CGR list (outgoing-only), the spec explicitly includes both directions: 'kuvab sissetulevad ja väljaminevad tehnokontrolli teated ühes tabelis'. The latest CTE reduces the append-only table to one row per message before filtering or paging. Text filters businessCaseId and vehicleRegistrationNumber are OR-combined with each other, then AND-combined with all other filters — this is an explicit requirement of the spec ('Väljad ID ja Sõiduki registreerimisnumber on otsitavad väljad — nende omavaheline seos on VÕI-loogika'). direction is an exposed filter parameter (not hard-coded). response_status_code is a direct column from the latest snapshot — no derived computation like in CGR (RSI always targets a single country, no broadcast ZZ). Sorting is whitelisted; total via COUNT(*) OVER () to keep round trips to one."
namespace: erru
params:
  businessCaseId:
    type: string
    required: false
  vehicleRegistrationNumber:
    type: string
    required: false
  sentFrom:
    type: string
    required: false
  sentUntil:
    type: string
    required: false
  rsiFrom:
    type: string
    required: false
  rsiTo:
    type: string
    required: false
  status:
    type: string
    required: false
  direction:
    type: string
    required: false
  handlerPersonalCode:
    type: string
    required: false
  sorting:
    type: string
    required: false
  page:
    type: string
    required: false
  page_size:
    type: string
    required: false
returns:
  - name: id
    type: number
    nullable: true
  - name: version
    type: number
    nullable: true
  - name: direction
    type: string
    nullable: true
  - name: status
    type: string
    nullable: true
  - name: business_case_id
    type: string
    nullable: true
  - name: sent_at
    type: string
    nullable: true
  - name: rsi_from
    type: string
    nullable: true
  - name: rsi_to
    type: string
    nullable: true
  - name: vehicle_registration_number
    type: string
    nullable: true
  - name: response_status_code
    type: string
    nullable: true
  - name: handler_name
    type: string
    nullable: true
  - name: total
    type: number
    nullable: true
*/
WITH latest AS (
  SELECT DISTINCT ON (rsi_message_key)
    rsi_message_key,
    version,
    direction,
    status,
    business_case_id,
    sent_at,
    rsi_from,
    rsi_to,
    vehicle_registration_number,
    response_status_code,
    handler_personal_code,
    handler_name
  FROM erru.rsi_message
  ORDER BY rsi_message_key, created_at DESC
)
SELECT
  l.rsi_message_key                AS id,
  l.version,
  l.direction,
  l.status,
  l.business_case_id,
  l.sent_at,
  l.rsi_from,
  l.rsi_to,
  l.vehicle_registration_number,
  l.response_status_code,
  l.handler_name,
  (COUNT(*) OVER ())::INTEGER      AS total
FROM latest l
WHERE
  -- Text filters: businessCaseId OR vehicleRegistrationNumber — OR between them, AND with the rest.
  -- When both are empty → no text filter (show all). When one is set → filter by that one.
  -- When both are set → match either. Implemented as: (both-empty) OR (id match) OR (regNr match).
  (
    (COALESCE(:businessCaseId, '') = '' AND COALESCE(:vehicleRegistrationNumber, '') = '')
    OR (COALESCE(:businessCaseId, '') <> '' AND l.business_case_id ILIKE '%' || :businessCaseId || '%')
    OR (COALESCE(:vehicleRegistrationNumber, '') <> '' AND l.vehicle_registration_number ILIKE '%' || :vehicleRegistrationNumber || '%')
  )
  AND (COALESCE(:sentFrom, '') = '' OR l.sent_at >= (:sentFrom)::DATE)
  -- upper bound is inclusive of the whole day
  AND (COALESCE(:sentUntil, '') = '' OR l.sent_at < ((:sentUntil)::DATE + INTERVAL '1 day'))
  AND (COALESCE(:rsiFrom, '') = '' OR l.rsi_from = :rsiFrom)
  AND (COALESCE(:rsiTo, '') = '' OR l.rsi_to = :rsiTo)
  AND (COALESCE(:status, '') = '' OR l.status = :status)
  AND (COALESCE(:direction, '') = '' OR l.direction = :direction)
  AND (COALESCE(:handlerPersonalCode, '') = '' OR l.handler_personal_code = :handlerPersonalCode)
ORDER BY
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'business_case_id asc'            THEN l.business_case_id END ASC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'business_case_id desc'           THEN l.business_case_id END DESC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'sent_at asc'                     THEN l.sent_at END ASC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'sent_at desc'                    THEN l.sent_at END DESC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'rsi_from asc'                    THEN l.rsi_from END ASC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'rsi_from desc'                   THEN l.rsi_from END DESC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'rsi_to asc'                      THEN l.rsi_to END ASC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'rsi_to desc'                     THEN l.rsi_to END DESC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'status asc'                      THEN l.status END ASC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'status desc'                     THEN l.status END DESC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'handler_name asc'                THEN l.handler_name COLLATE "et-EE-x-icu" END ASC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'handler_name desc'               THEN l.handler_name COLLATE "et-EE-x-icu" END DESC,
  -- deterministic tiebreaker: prevents LIMIT/OFFSET paging from repeating or skipping rows
  l.rsi_message_key DESC
LIMIT  COALESCE(NULLIF(:page_size, ''), '20')::INTEGER
OFFSET ((GREATEST(COALESCE(NULLIF(:page, ''), '1')::INTEGER, 1) - 1) * COALESCE(NULLIF(:page_size, ''), '20')::INTEGER);
