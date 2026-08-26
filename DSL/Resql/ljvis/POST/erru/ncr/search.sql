/*
description: "Paginated, filtered list of NCR cases — BOTH incoming and outgoing (LJVIS2-65). The latest CTE reduces the append-only table to one row per CASE (ncr_message_key) before filtering or paging — NOT per workflow_id as the task's 'Peamised komponendid' section literally states, since workflow_id is NULL on every unsent outgoing draft (would collapse all drafts into a single NULL group and drop the rest); ncr_message_key is the correct, always-populated logical case identity used identically by get.sql/get-by-workflow-id.sql elsewhere in this module. All filters are plain AND (no OR-pair like RSI/CGR's id/regNr — NCR only has one text filter, businessCaseId). hasInfringement is computed from jsonb_array_length(serious_infringements) > 0 for the red-highlight row styling (LJVIS2-65 §4 'Rikkumisega teadete eristus'). Sorting is whitelisted; total via COUNT(*) OVER() to keep round trips to one."
namespace: erru
params:
  businessCaseId:
    type: string
    required: false
  sentFrom:
    type: string
    required: false
  sentUntil:
    type: string
    required: false
  ncrFrom:
    type: string
    required: false
  ncrTo:
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
  - name: ncr_from
    type: string
    nullable: true
  - name: ncr_to
    type: string
    nullable: true
  - name: transport_undertaking_name
    type: string
    nullable: true
  - name: handler_name
    type: string
    nullable: true
  - name: has_infringement
    type: boolean
    nullable: true
  - name: total
    type: number
    nullable: true
*/
WITH latest AS (
  SELECT DISTINCT ON (ncr_message_key)
    ncr_message_key,
    version,
    direction,
    status,
    business_case_id,
    sent_at,
    ncr_from,
    ncr_to,
    transport_undertaking_name,
    handler_personal_code,
    handler_name,
    serious_infringements
  FROM erru.ncr_message
  ORDER BY ncr_message_key, created_at DESC
)
SELECT
  l.ncr_message_key                             AS id,
  l.version,
  l.direction,
  l.status,
  l.business_case_id,
  l.sent_at,
  l.ncr_from,
  l.ncr_to,
  l.transport_undertaking_name,
  l.handler_name,
  (jsonb_array_length(COALESCE(l.serious_infringements, '[]'::JSONB)) > 0) AS has_infringement,
  (COUNT(*) OVER ())::INTEGER                   AS total
FROM latest l
WHERE
  (COALESCE(:businessCaseId, '') = '' OR l.business_case_id ILIKE '%' || :businessCaseId || '%')
  AND (COALESCE(:sentFrom, '') = '' OR l.sent_at >= (:sentFrom)::DATE)
  -- upper bound is inclusive of the whole day
  AND (COALESCE(:sentUntil, '') = '' OR l.sent_at < ((:sentUntil)::DATE + INTERVAL '1 day'))
  AND (COALESCE(:ncrFrom, '') = '' OR l.ncr_from = :ncrFrom)
  AND (COALESCE(:ncrTo, '') = '' OR l.ncr_to = :ncrTo)
  AND (COALESCE(:status, '') = '' OR l.status = :status)
  AND (COALESCE(:direction, '') = '' OR l.direction = :direction)
  AND (COALESCE(:handlerPersonalCode, '') = '' OR l.handler_personal_code = :handlerPersonalCode)
ORDER BY
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'business_case_id asc'  THEN l.business_case_id END ASC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'business_case_id desc' THEN l.business_case_id END DESC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'sent_at asc'           THEN l.sent_at END ASC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'sent_at desc'          THEN l.sent_at END DESC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'ncr_from asc'          THEN l.ncr_from END ASC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'ncr_from desc'         THEN l.ncr_from END DESC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'ncr_to asc'            THEN l.ncr_to END ASC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'ncr_to desc'           THEN l.ncr_to END DESC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'transport_undertaking_name asc'  THEN l.transport_undertaking_name COLLATE "et-EE-x-icu" END ASC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'transport_undertaking_name desc' THEN l.transport_undertaking_name COLLATE "et-EE-x-icu" END DESC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'status asc'            THEN l.status END ASC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'status desc'           THEN l.status END DESC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'handler_name asc'      THEN l.handler_name COLLATE "et-EE-x-icu" END ASC,
  CASE WHEN COALESCE(:sorting, 'sent_at desc') = 'handler_name desc'     THEN l.handler_name COLLATE "et-EE-x-icu" END DESC,
  -- deterministic tiebreaker: prevents LIMIT/OFFSET paging from repeating or skipping rows
  l.ncr_message_key DESC
LIMIT  COALESCE(NULLIF(:page_size, ''), '20')::INTEGER
OFFSET ((GREATEST(COALESCE(NULLIF(:page, ''), '1')::INTEGER, 1) - 1) * COALESCE(NULLIF(:page_size, ''), '20')::INTEGER);
