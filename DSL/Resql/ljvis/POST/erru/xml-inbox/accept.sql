/*
description: 'Durable acceptance of one inbound ERRU XML message received through XTR (erru-xml-adapter): inserts the erru.xml_inbox row already claimed (status processing, 2 minute lease), or recognises a redelivery. Exact redelivery of an unfinished or failed row takes the claim over; a processed row is returned as is; the same technical_id with a different payload_digest is a conflict (never merged, the attempt is recorded). Async mode (async = true, CGR/CTUD): the row is parked for the cron worker instead (claimed_by erru-xml-adapter-xtr-async, due now, long lease) and request_json is stored. Returns exactly one JSON row.'
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
    (message_type, transport_peer, technical_id, workflow_id, business_case_id, raw_xml, payload_digest,
     status, claimed_by, claimed_at, lease_expires_at, attempts, deadline_at, next_attempt_at, request_json)
  VALUES
    (:messageType, :transportPeer, :technicalId::uuid, NULLIF(:workflowId, '')::uuid, :businessCaseId, :rawXml, :digest,
     'processing', CASE WHEN :async = 'true' THEN 'erru-xml-adapter-xtr-async' ELSE 'erru-xml-adapter-xtr' END, now(),
     now() + CASE WHEN :async = 'true' THEN interval '10 minutes' ELSE interval '2 minutes' END, 1,
     COALESCE(NULLIF(:deadlineAt, '')::timestamptz, now() + interval '10 seconds'),
     CASE WHEN :async = 'true' THEN now() END, NULLIF(:requestJson, ''))
  ON CONFLICT (technical_id) DO NOTHING
  RETURNING id, status, payload_digest, attempts, received_at, deadline_at, TRUE AS inserted, TRUE AS claimed
),
conflict AS (
  UPDATE erru.xml_inbox
     SET last_error = COALESCE(last_error || E'\n', '') || 'conflicting redelivery rejected at ' || now()::text
                      || ', attempted payload_digest=' || :digest
   WHERE technical_id = :technicalId::uuid
     AND payload_digest <> :digest
     AND COALESCE(last_error, '') NOT LIKE '%attempted payload_digest=' || :digest || '%'
     AND NOT EXISTS (SELECT 1 FROM ins)
  RETURNING id
),
taken AS (
  UPDATE erru.xml_inbox
     SET status = 'processing',
         claimed_by = CASE WHEN :async = 'true' THEN 'erru-xml-adapter-xtr-async' ELSE 'erru-xml-adapter-xtr' END, claimed_at = now(),
         lease_expires_at = now() + CASE WHEN :async = 'true' THEN interval '10 minutes' ELSE interval '2 minutes' END,
         next_attempt_at = CASE WHEN :async = 'true' THEN now() END, attempts = attempts + 1,
         request_json = COALESCE(request_json, NULLIF(:requestJson, ''))
   WHERE technical_id = :technicalId::uuid
     AND payload_digest = :digest
     AND (status IN ('received', 'failed') OR (status = 'processing' AND lease_expires_at < now()))
     AND NOT EXISTS (SELECT 1 FROM ins)
  RETURNING id, status, payload_digest, attempts, received_at, deadline_at, FALSE AS inserted, TRUE AS claimed
),
existing AS (
  SELECT id, status, payload_digest, attempts, received_at, deadline_at, FALSE AS inserted, FALSE AS claimed
    FROM erru.xml_inbox
   WHERE technical_id = :technicalId::uuid
     AND NOT EXISTS (SELECT 1 FROM ins)
     AND NOT EXISTS (SELECT 1 FROM taken)
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
         'responseTechnicalId', overlay(overlay(md5('erru-response:' || r.id::text) placing '4' from 13) placing '8' from 17)::uuid,
         'errorTechnicalId', overlay(overlay(md5('erru-en:' || r.id::text) placing '4' from 13) placing '8' from 17)::uuid
       )::text AS result
  FROM (SELECT * FROM ins UNION ALL SELECT * FROM taken UNION ALL SELECT * FROM existing) r
 LIMIT 1;
