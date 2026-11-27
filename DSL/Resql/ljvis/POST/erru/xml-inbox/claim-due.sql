/*
description: 'Cron worker (async CGR/CTUD queue and recovery of the synchronous NU/NCR/RSI flows): takes over up to batchSize due rows (CGR / CTUD by their Hub deadline, others oldest first; a CGR / CTUD row whose Hub response window has passed is not taken, it is closed as processed in the same statement, up to 500 per call): rows that xml-inbox/accept parked in async mode (claimed_by erru-xml-adapter-xtr-async, due now), rows whose worker died mid-way (claimed_by erru-xml-adapter-xtr, lease expired) and rows sent back for a retry (status received, next_attempt_at due or unset; this also picks up a manually reset failed row). Only rows with the stored request_json qualify (all XTR flows store it). Each row gets the xtr claim (a new processing event, attempts + 1, compare-and-swap on seq so of two concurrent claimers one wins) with a 10 minute lease (a batch of 5 runs one worker after another, each up to ~75 s, NU up to ~190 s), so finish and the rest of the flow work as for a synchronous request. Returns one JSON row per claimed row, none when nothing is due. failed rows are never taken automatically (the Hub or XSD rejected the answer: manual recovery). Only rows whose current event is at most 6 hours old are scanned (the queue does not grow with the history); an older open row needs a manual reset.'
namespace: erru
params:
  messageTypes:
    type: string
  batchSize:
    type: number
returns:
- name: result
  type: string
*/
WITH open_latest AS MATERIALIZED (
  -- The queue is read from the open events of the last 6 hours, not from erru.xml_inbox_current: the view computes
  -- max(seq) for every inbox row ever received. An open event is current only when no later event of the same row
  -- exists (anti-join on uq_xml_inbox_event_inbox_seq). In a running system an open current event is never older than
  -- a lease (at most 10 minutes) or a retry delay (30 s): the cron takes it over with a new event. A row left open for
  -- longer than 6 hours (the cron stopped) needs a manual reset, see docs/integrations/erru-xml-recovery.md.
  SELECT e.inbox_id, e.seq, e.attempts, e.lease_expires_at, e.next_attempt_at
    FROM erru.xml_inbox_event e
   WHERE e.event_type IN ('received', 'processing')
     AND e.created_at > now() - interval '6 hours'
     AND (
           (e.event_type = 'processing' AND e.claimed_by = 'erru-xml-adapter-xtr-async' AND e.next_attempt_at <= now())
        OR (e.event_type = 'processing' AND e.claimed_by = 'erru-xml-adapter-xtr' AND e.lease_expires_at < now())
        OR (e.event_type = 'received' AND (e.next_attempt_at IS NULL OR e.next_attempt_at <= now()))
     )
     AND NOT EXISTS (SELECT 1 FROM erru.xml_inbox_event n WHERE n.inbox_id = e.inbox_id AND n.seq > e.seq)
),
cand AS (
  -- No JOIN (Resql rule): the receipt columns are read with primary key sub-selects.
  SELECT o.inbox_id AS id, o.seq, o.attempts,
         (SELECT i.message_type FROM erru.xml_inbox i WHERE i.id = o.inbox_id) AS message_type,
         (SELECT i.deadline_at FROM erru.xml_inbox i WHERE i.id = o.inbox_id) AS deadline_at,
         COALESCE(o.next_attempt_at, o.lease_expires_at, (SELECT i.received_at FROM erru.xml_inbox i WHERE i.id = o.inbox_id)) AS due_at
    FROM open_latest o
   WHERE EXISTS (SELECT 1 FROM erru.xml_inbox i
                  WHERE i.id = o.inbox_id
                    AND i.message_type = ANY (string_to_array(:messageTypes, ','))
                    AND i.request_json IS NOT NULL)
),
-- A CGR / CTUD row whose Hub response window (deadline_at) has passed gets no answer: the worker would only close it
-- (markExpired). It is closed here in one INSERT (up to 500 per call), so it does not take a worker slot and does not stay open.
-- NU / NCR / RSI are never closed here: their business effects must happen even when the answer is late.
expired AS (
  INSERT INTO erru.xml_inbox_event (inbox_id, seq, event_type, attempts, error)
  SELECT c.id, c.seq + 1, 'processed', c.attempts, 'response deadline passed, answer not delivered'
    FROM cand c
   WHERE c.message_type IN ('CheckGoodRepute_Request', 'CheckTransportUndertakingData_Request')
     AND c.deadline_at IS NOT NULL AND c.deadline_at <= now()
   ORDER BY c.deadline_at
   LIMIT 500
  ON CONFLICT (inbox_id, seq) DO NOTHING
  RETURNING inbox_id
),
due AS (
  -- CGR / CTUD rows in the order of their deadline (the row that is closest to its deadline and still open goes first),
  -- other rows by the time they became due.
  SELECT c.id, c.seq, c.attempts
    FROM cand c
   WHERE NOT (c.message_type IN ('CheckGoodRepute_Request', 'CheckTransportUndertakingData_Request')
              AND c.deadline_at IS NOT NULL AND c.deadline_at <= now())
   ORDER BY CASE WHEN c.message_type IN ('CheckGoodRepute_Request', 'CheckTransportUndertakingData_Request') AND c.deadline_at IS NOT NULL
                 THEN c.deadline_at ELSE c.due_at END, c.id
   LIMIT GREATEST(1, LEAST(COALESCE(:batchSize::int, 1), 10))
),
claimed AS (
  INSERT INTO erru.xml_inbox_event (inbox_id, seq, event_type, attempts, claimed_by, lease_expires_at)
  SELECT d.id, d.seq + 1, 'processing', d.attempts + 1, 'erru-xml-adapter-xtr', now() + interval '10 minutes'
    FROM due d
  ON CONFLICT (inbox_id, seq) DO NOTHING
  RETURNING inbox_id, attempts
)
SELECT json_build_object(
  'inboxId', i.id,
  'messageType', i.message_type,
  'attempts', (SELECT k.attempts FROM claimed k WHERE k.inbox_id = i.id),
  'requestJson', i.request_json,
  'rawXml', i.raw_xml,
  'receivedAt', to_char(i.received_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'deadlineAtMs', (extract(epoch FROM i.deadline_at) * 1000)::bigint,
  'responseTechnicalId', overlay(overlay(md5('erru-response:' || i.technical_id::text) placing '4' from 13) placing '8' from 17)::uuid,
  'errorTechnicalId', overlay(overlay(md5('erru-en:' || i.technical_id::text) placing '4' from 13) placing '8' from 17)::uuid
)::text AS result
  FROM erru.xml_inbox i
 WHERE i.id IN (SELECT inbox_id FROM claimed)
 ORDER BY i.id;
