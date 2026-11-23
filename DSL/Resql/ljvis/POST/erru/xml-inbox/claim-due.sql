/*
description: 'Cron worker (async CGR/CTUD queue and recovery of the synchronous NU/NCR/RSI flows): takes over up to batchSize due rows, oldest first: rows that xml-inbox/accept parked in async mode (claimed_by erru-xml-adapter-xtr-async, due now), rows whose worker died mid-way (claimed_by erru-xml-adapter-xtr, lease expired) and rows sent back for a retry (status received, next_attempt_at due or unset; this also picks up a manually reset failed row). Only rows with the stored request_json qualify (all XTR flows store it). Each row gets the xtr claim (a new processing event, attempts + 1, compare-and-swap on seq so of two concurrent claimers one wins) with a 6 minute lease (a batch of 3 runs one worker after another, each up to ~75 s, NU up to ~190 s), so finish and the rest of the flow work as for a synchronous request. Returns one JSON row per claimed row, none when nothing is due. failed rows are never taken automatically (the Hub or XSD rejected the answer: manual recovery).'
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
WITH due AS (
  SELECT c.id, c.seq, c.attempts
    FROM erru.xml_inbox_current c
   WHERE c.message_type = ANY (string_to_array(:messageTypes, ','))
     AND c.request_json IS NOT NULL
     AND (
           (c.status = 'processing' AND c.claimed_by = 'erru-xml-adapter-xtr-async' AND c.next_attempt_at <= now())
        OR (c.status = 'processing' AND c.claimed_by = 'erru-xml-adapter-xtr' AND c.lease_expires_at < now())
        OR (c.status = 'received' AND (c.next_attempt_at IS NULL OR c.next_attempt_at <= now()))
     )
   ORDER BY COALESCE(c.next_attempt_at, c.lease_expires_at, c.received_at), c.id
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
