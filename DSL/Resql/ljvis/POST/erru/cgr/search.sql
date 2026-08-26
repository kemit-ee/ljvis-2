/*
declaration:
  version: 0.1
  description: "Paginated, filtered list of OUTGOING CGR requests only (LJVIS2-140) — the specification explicitly scopes this list to requests Estonia has sent ('väljaminevad päringud'), unlike the CTUD list which covers both directions. The `latest` CTE reduces the append-only table to exactly one row per request (the newest snapshot) before any filtering or paging. All filters are optional and AND-combined — unlike CTUD, tmFirstName/tmFamilyName are separate AND-combined fields, not an OR-group, per the task specification. response_status_code is derived here (not a stored column, unlike CTUD): for a single-country request (cgr_to <> 'ZZ') with exactly one member_states entry, it is that entry's statusCode; for a broadcast request (cgr_to = 'ZZ') it is always NULL — the per-country breakdown is shown only in the request detail view, never in the list. Sorting is whitelisted; total is returned via COUNT(*) OVER () so the caller needs only one round trip."
  method: post
  accepts: json
  returns: json
  namespace: erru
  allowlist:
    body:
      - field: businessCaseId
        type: string
      - field: tmFirstName
        type: string
      - field: tmFamilyName
        type: string
      - field: sentFrom
        type: string
      - field: sentUntil
        type: string
      - field: cgrTo
        type: string
      - field: status
        type: string
      - field: handlerPersonalCode
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
      - field: status
        type: string
      - field: business_case_id
        type: string
      - field: sent_at
        type: string
      - field: tm_first_name
        type: string
      - field: tm_family_name
        type: string
      - field: cgr_to
        type: string
      - field: response_status_code
        type: string
      - field: handler_name
        type: string
      - field: total
        type: number
*/
WITH latest AS (
  SELECT DISTINCT ON (cgr_request_key)
    cgr_request_key,
    version,
    status,
    business_case_id,
    sent_at,
    tm_first_name,
    tm_family_name,
    cgr_to,
    member_states,
    handler_personal_code,
    handler_name
  FROM erru.cgr_request
  WHERE direction = 'outgoing'
  ORDER BY cgr_request_key, created_at DESC
)
SELECT
  l.cgr_request_key AS id,
  l.version,
  l.status,
  l.business_case_id,
  l.sent_at,
  l.tm_first_name,
  l.tm_family_name,
  l.cgr_to,
  -- Single-country send: the one member_states entry IS the response outcome.
  -- Broadcast (ZZ): no single outcome — breakdown belongs to the detail view only.
  CASE
    WHEN l.cgr_to <> 'ZZ' AND jsonb_array_length(COALESCE(l.member_states, '[]'::JSONB)) = 1
      THEN l.member_states -> 0 ->> 'statusCode'
    ELSE NULL
  END AS response_status_code,
  l.handler_name,
  (COUNT(*) OVER ())::INTEGER AS total
FROM latest l
WHERE (COALESCE(:businessCaseId, '') = '' OR l.business_case_id ILIKE '%' || :businessCaseId || '%')
  AND (COALESCE(:tmFirstName, '') = '' OR l.tm_first_name ILIKE '%' || :tmFirstName || '%')
  AND (COALESCE(:tmFamilyName, '') = '' OR l.tm_family_name ILIKE '%' || :tmFamilyName || '%')
  AND (COALESCE(:sentFrom, '') = '' OR l.sent_at >= (:sentFrom)::DATE)
  -- upper bound is inclusive of the whole day, hence < day + 1
  AND (COALESCE(:sentUntil, '') = '' OR l.sent_at < ((:sentUntil)::DATE + INTERVAL '1 day'))
  AND (COALESCE(:cgrTo, '') = '' OR l.cgr_to = :cgrTo)
  AND (COALESCE(:status, '') = '' OR l.status = :status)
  AND (COALESCE(:handlerPersonalCode, '') = '' OR l.handler_personal_code = :handlerPersonalCode)
ORDER BY
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'business_case_id asc'  THEN l.business_case_id END ASC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'business_case_id desc' THEN l.business_case_id END DESC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'sent_at asc'           THEN l.sent_at END ASC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'sent_at desc'          THEN l.sent_at END DESC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'tm_first_name asc'     THEN l.tm_first_name COLLATE "et-EE-x-icu" END ASC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'tm_first_name desc'    THEN l.tm_first_name COLLATE "et-EE-x-icu" END DESC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'tm_family_name asc'    THEN l.tm_family_name COLLATE "et-EE-x-icu" END ASC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'tm_family_name desc'   THEN l.tm_family_name COLLATE "et-EE-x-icu" END DESC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'cgr_to asc'            THEN l.cgr_to END ASC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'cgr_to desc'           THEN l.cgr_to END DESC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'status asc'            THEN l.status END ASC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'status desc'           THEN l.status END DESC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'handler_name asc'      THEN l.handler_name COLLATE "et-EE-x-icu" END ASC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'handler_name desc'     THEN l.handler_name COLLATE "et-EE-x-icu" END DESC,
  -- deterministic tiebreaker: without it LIMIT/OFFSET paging can repeat or skip rows
  l.cgr_request_key DESC
LIMIT COALESCE(NULLIF(:page_size, ''), '20')::INTEGER
OFFSET ((GREATEST(COALESCE(NULLIF(:page, ''), '1')::INTEGER, 1) - 1) * COALESCE(NULLIF(:page_size, ''), '20')::INTEGER);
