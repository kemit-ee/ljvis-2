/*
description: Paginated, filtered list of NCR cases - BOTH incoming and outgoing (LJVIS2-65). The latest
  CTE reduces the append-only table to one row per CASE (ncr_message_key) before filtering or paging -
  NOT per workflow_id as the task's 'Peamised komponendid' section literally states, since workflow_id
  is NULL on every unsent outgoing draft (would collapse all drafts into a single NULL group and drop
  the rest); ncr_message_key is the correct, always-populated logical case identity used identically by
  get.sql/get-by-workflow-id.sql elsewhere in this module. All filters are plain AND (no OR-pair like
  RSI/CGR's id/regNr - NCR only has one text filter, businessCaseId). has_infringement ('check_result' = Fail, a serious infringement or a
  minor-infringement block) drives the pink row styling (LJVIS2-65 §4 'Rikkumisega teadete eristus'). needs_attention
  = incoming + has_infringement + not yet resolved (received / viewed / answer_drafted / error; answered and
  forwarded are resolved) - the cases an official must act on. event_at ('Kuupäev') = sent_at for outgoing cases,
  arrival time (first 'received' snapshot, NOT the foreign sender's header sentAt and NOT the latest snapshot's
  created_at, which moves with every state change) for incoming ones. Sorting is whitelisted ('attention' = needs_attention
  first, oldest first, then the rest newest first); total via COUNT(*) OVER() to keep round trips to one.
namespace: erru
params:
  businessCaseId:
    type: string
    required: false
  dateFrom:
    type: string
    required: false
  dateUntil:
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
  automatic:
    type: string
    required: false
  needsAttention:
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
- name: event_at
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
- name: needs_attention
  type: boolean
  nullable: true
- name: automatic
  type: boolean
  nullable: true
- name: total
  type: number
  nullable: true
*/
WITH latest AS (
  SELECT DISTINCT ON (m.ncr_message_key)
    m.ncr_message_key,
    m.version,
    m.direction,
    m.status,
    m.business_case_id,
    -- "Kuupäev": väljaminev = saatmise aeg (NULL saatmata mustandil); sissetulev = saabumise aeg
    -- ehk esimene 'received' snapshot. Viimase snapshoti created_at liigub iga olekumuutusega.
    CASE m.direction
      WHEN 'outgoing' THEN m.sent_at
      ELSE m.received_at
    END AS event_at,
    m.ncr_from,
    m.ncr_to,
    m.transport_undertaking_name,
    m.handler_personal_code,
    m.handler_name,
    -- COALESCE: NULL check_result / minor_infringement must give false, not NULL (a NULL flag would drop
    -- the row from the needsAttention = 'false' filter)
    (
      COALESCE(m.check_result = 'Fail', FALSE)
      OR jsonb_array_length(COALESCE(m.serious_infringements, '[]'::JSONB)) > 0
      OR COALESCE(jsonb_typeof(m.minor_infringement) = 'object', FALSE)
    ) AS has_infringement
  FROM (
    -- Window (one pass over the table) instead of a per-row subquery: DISTINCT ON evaluates the select list
    -- for every snapshot row, not only the latest one.
    SELECT n.*,
      MIN(n.created_at) FILTER (WHERE n.status = 'received') OVER (PARTITION BY n.ncr_message_key) AS received_at
    FROM erru.ncr_message n
  ) m
  ORDER BY m.ncr_message_key, m.created_at DESC
), flagged AS (
  SELECT
    l.*,
    (l.direction = 'incoming' AND l.has_infringement
      AND l.status IN ('received', 'viewed', 'answer_drafted', 'error')) AS needs_attention
  FROM latest l
)
SELECT
  l.ncr_message_key                             AS id,
  l.version,
  l.direction,
  l.status,
  l.business_case_id,
  l.event_at,
  l.ncr_from,
  l.ncr_to,
  l.transport_undertaking_name,
  l.handler_name,
  l.has_infringement,
  l.needs_attention,
  -- "Automaatne" = LJVIS on selle juhtumi ise ERRU-sse välja saatnud (öine
  -- CronManager autodispatch); build_failed logikirjed ei loe (NCR teadet ei loodud).
  EXISTS (
    SELECT 1 FROM erru.ncr_autodispatch_log a
    WHERE a.business_case_id = l.business_case_id AND a.outcome <> 'build_failed'
  )                                             AS automatic,
  (COUNT(*) OVER ())::INTEGER                   AS total
FROM flagged l
WHERE
  (COALESCE(:businessCaseId, '') = '' OR l.business_case_id ILIKE '%' || :businessCaseId || '%')
  AND (COALESCE(:dateFrom, '') = '' OR l.event_at >= (:dateFrom)::DATE)
  -- upper bound is inclusive of the whole day
  AND (COALESCE(:dateUntil, '') = '' OR l.event_at < ((:dateUntil)::DATE + INTERVAL '1 day'))
  AND (COALESCE(:ncrFrom, '') = '' OR l.ncr_from = :ncrFrom)
  AND (COALESCE(:ncrTo, '') = '' OR l.ncr_to = :ncrTo)
  AND (COALESCE(:status, '') = '' OR l.status = :status)
  AND (COALESCE(:direction, '') = '' OR l.direction = :direction)
  AND (COALESCE(:handlerPersonalCode, '') = '' OR l.handler_personal_code = :handlerPersonalCode)
  AND (COALESCE(:needsAttention, '') = '' OR l.needs_attention = (:needsAttention = 'true'))
  AND (
    COALESCE(:automatic, '') = ''
    OR EXISTS (
         SELECT 1 FROM erru.ncr_autodispatch_log a
         WHERE a.business_case_id = l.business_case_id AND a.outcome <> 'build_failed'
       ) = (:automatic = 'true')
  )
ORDER BY
  CASE WHEN COALESCE(:sorting, 'attention') = 'business_case_id asc'  THEN l.business_case_id END ASC,
  CASE WHEN COALESCE(:sorting, 'attention') = 'business_case_id desc' THEN l.business_case_id END DESC,
  CASE WHEN COALESCE(:sorting, 'attention') = 'event_at asc'          THEN l.event_at END ASC NULLS LAST,
  CASE WHEN COALESCE(:sorting, 'attention') = 'event_at desc'         THEN l.event_at END DESC NULLS LAST,
  -- 'attention': tegelemist vajavad read ees, nende seas vanim esimesena; ülejäänud uuemad enne
  CASE WHEN COALESCE(:sorting, 'attention') = 'attention'             THEN l.needs_attention END DESC,
  CASE WHEN COALESCE(:sorting, 'attention') = 'attention' AND l.needs_attention THEN l.event_at END ASC NULLS LAST,
  CASE WHEN COALESCE(:sorting, 'attention') = 'attention' AND NOT l.needs_attention THEN l.event_at END DESC NULLS LAST,
  CASE WHEN COALESCE(:sorting, 'attention') = 'ncr_from asc'          THEN l.ncr_from END ASC,
  CASE WHEN COALESCE(:sorting, 'attention') = 'ncr_from desc'         THEN l.ncr_from END DESC,
  CASE WHEN COALESCE(:sorting, 'attention') = 'ncr_to asc'            THEN l.ncr_to END ASC,
  CASE WHEN COALESCE(:sorting, 'attention') = 'ncr_to desc'           THEN l.ncr_to END DESC,
  CASE WHEN COALESCE(:sorting, 'attention') = 'transport_undertaking_name asc'  THEN l.transport_undertaking_name COLLATE "et-EE-x-icu" END ASC,
  CASE WHEN COALESCE(:sorting, 'attention') = 'transport_undertaking_name desc' THEN l.transport_undertaking_name COLLATE "et-EE-x-icu" END DESC,
  CASE WHEN COALESCE(:sorting, 'attention') = 'status asc'            THEN l.status END ASC,
  CASE WHEN COALESCE(:sorting, 'attention') = 'status desc'           THEN l.status END DESC,
  CASE WHEN COALESCE(:sorting, 'attention') = 'handler_name asc'      THEN l.handler_name COLLATE "et-EE-x-icu" END ASC,
  CASE WHEN COALESCE(:sorting, 'attention') = 'handler_name desc'     THEN l.handler_name COLLATE "et-EE-x-icu" END DESC,
  -- deterministic tiebreaker: prevents LIMIT/OFFSET paging from repeating or skipping rows
  l.ncr_message_key DESC
LIMIT  COALESCE(NULLIF(:page_size, ''), '20')::INTEGER
OFFSET ((GREATEST(COALESCE(NULLIF(:page, ''), '1')::INTEGER, 1) - 1) * COALESCE(NULLIF(:page_size, ''), '20')::INTEGER);
