/*
description: 'Durable acceptance of one inbound ERRU XML message received through XTR (erru-xml-adapter): inserts the immutable erru.xml_inbox receipt plus its first event (processing, 3 minute lease), or recognises a redelivery. Exact redelivery of an unfinished or failed row takes the claim over; a processed row is returned as is; the same technical_id with a different payload_digest is a conflict (never merged, the digest is recorded in erru.xml_inbox_conflict). A takeover is a new event (append-only, compare-and-swap on seq). Async mode (async = true, CGR/CTUD): the row is parked for the cron worker instead (claimed_by erru-xml-adapter-xtr-async, due now, long lease). Returns exactly one JSON row.'
namespace: erru
params:
  messageType:
    type: string
  technicalId:
    type: string
  workflowId:
    type: string
    required: false
  businessCaseId:
    type: string
    required: false
  transportPeer:
    type: string
    required: false
  rawXml:
    type: string
  digest:
    type: string
  deadlineAt:
    type: string
    required: false
  async:
    type: string
    required: false
  requestJson:
    type: string
    required: false
returns:
- name: result
  type: string
*/
WITH ins AS (
  INSERT INTO erru.xml_inbox
    (message_type, transport_peer, technical_id, workflow_id, business_case_id, raw_xml, payload_digest, deadline_at, request_json)
  VALUES
    (:messageType, :transportPeer, :technicalId::uuid, NULLIF(:workflowId, '')::uuid, :businessCaseId, :rawXml, :digest,
     COALESCE(NULLIF(:deadlineAt, '')::timestamptz, now() + interval '10 seconds'), NULLIF(:requestJson, ''))
  ON CONFLICT (technical_id) DO NOTHING
  RETURNING id, payload_digest, received_at, deadline_at
),
first_event AS (
  INSERT INTO erru.xml_inbox_event (inbox_id, seq, event_type, attempts, claimed_by, lease_expires_at, next_attempt_at)
  SELECT id, 1, 'processing', 1,
         CASE WHEN :async = 'true' THEN 'erru-xml-adapter-xtr-async' ELSE 'erru-xml-adapter-xtr' END,
         now() + CASE WHEN :async = 'true' THEN interval '10 minutes' ELSE interval '3 minutes' END,
         CASE WHEN :async = 'true' THEN now() END
    FROM ins
  RETURNING inbox_id
),
cur AS (
  SELECT * FROM erru.xml_inbox_current WHERE technical_id = :technicalId::uuid
),
conflict AS (
  INSERT INTO erru.xml_inbox_conflict (inbox_id, payload_digest)
  SELECT id, :digest FROM cur
   WHERE payload_digest <> :digest
     AND NOT EXISTS (SELECT 1 FROM ins)
  ON CONFLICT (inbox_id, payload_digest) DO NOTHING
  RETURNING id
),
taken AS (
  INSERT INTO erru.xml_inbox_event (inbox_id, seq, event_type, attempts, claimed_by, lease_expires_at, next_attempt_at)
  SELECT id, seq + 1, 'processing', attempts + 1,
         CASE WHEN :async = 'true' THEN 'erru-xml-adapter-xtr-async' ELSE 'erru-xml-adapter-xtr' END,
         now() + CASE WHEN :async = 'true' THEN interval '10 minutes' ELSE interval '3 minutes' END,
         CASE WHEN :async = 'true' THEN now() END
    FROM cur
   WHERE payload_digest = :digest
     AND (status IN ('received', 'failed') OR (status = 'processing' AND lease_expires_at < now()))
     AND NOT EXISTS (SELECT 1 FROM ins)
  ON CONFLICT (inbox_id, seq) DO NOTHING
  RETURNING inbox_id, attempts
)
SELECT json_build_object(
         'inboxId', r.id,
         'status', r.status,
         'attempts', r.attempts,
         'inserted', r.inserted,
         'claimed', r.claimed,
         'digestMatches', r.payload_digest = :digest,
         'receivedAt', to_char(r.received_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
         'deadlineAtMs', (extract(epoch FROM r.deadline_at) * 1000)::bigint,
         'responseTechnicalId', overlay(overlay(md5('erru-response:' || lower(:technicalId)) placing '4' from 13) placing '8' from 17)::uuid,
         'errorTechnicalId', overlay(overlay(md5('erru-en:' || lower(:technicalId)) placing '4' from 13) placing '8' from 17)::uuid
       )::text AS result
  FROM (
        SELECT i.id, 'processing'::text AS status, 1 AS attempts, i.received_at, i.deadline_at, i.payload_digest, TRUE AS inserted, TRUE AS claimed
          FROM ins i
        UNION ALL
        SELECT c.id, 'processing'::text, (SELECT t.attempts FROM taken t WHERE t.inbox_id = c.id), c.received_at, c.deadline_at, c.payload_digest, FALSE, TRUE
          FROM cur c
         WHERE c.id IN (SELECT inbox_id FROM taken)
        UNION ALL
        SELECT c.id, c.status, c.attempts, c.received_at, c.deadline_at, c.payload_digest, FALSE, FALSE
          FROM cur c
         WHERE NOT EXISTS (SELECT 1 FROM ins) AND NOT EXISTS (SELECT 1 FROM taken)
       ) r
 LIMIT 1;
