/*
description: 'Cron worker (async CGR/CTUD queue and recovery of the synchronous NU/NCR/RSI flows): takes over up to batchSize due rows, oldest first: rows that xml-inbox/accept parked in async mode (claimed_by erru-xml-adapter-xtr-async, due now), rows whose worker died mid-way (claimed_by erru-xml-adapter-xtr, lease expired) and rows sent back for a retry (status received, next_attempt_at due or unset; this also picks up a manually reset failed row). Only rows with the stored request_json qualify (all XTR flows store it). Each row gets the xtr claim (a new processing event, attempts + 1, compare-and-swap on seq so of two concurrent claimers one wins) with a 6 minute lease (a batch of 3 runs one worker after another, each up to ~75 s, NU up to ~190 s), so finish and the rest of the flow work as for a synchronous request. Returns one JSON row per claimed row, none when nothing is due. failed rows are never taken automatically (the Hub or XSD rejected the answer: manual recovery). Only rows whose current event is at most 6 hours old are scanned (the queue does not grow with the history); an older open row needs a manual reset.'
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
due AS (
  SELECT i.id, o.seq, o.attempts
    FROM open_latest o
    JOIN erru.xml_inbox i ON i.id = o.inbox_id
   WHERE i.message_type = ANY (string_to_array(:messageTypes, ','))
     AND i.request_json IS NOT NULL
   ORDER BY COALESCE(o.next_attempt_at, o.lease_expires_at, i.received_at), i.id
   LIMIT GREATEST(1, LEAST(COALESCE(:batchSize::int, 1), 10))
),
claimed AS (
  INSERT INTO erru.xml_inbox_event (inbox_id, seq, event_type, attempts, claimed_by, lease_expires_at)
  SELECT d.id, d.seq + 1, 'processing', d.attempts + 1, 'erru-xml-adapter-xtr', now() + interval '6 minutes'
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
