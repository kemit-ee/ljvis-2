/*
description: 'Cron worker (CGR/CTUD, answered asynchronously): takes over the oldest due row that xml-inbox/accept parked in async mode (claimed_by erru-xml-adapter-xtr-async, due now) and gives it the normal 2 minute xtr claim, so finish and the rest of the flow work as for synchronous rows. Returns one JSON row, or no row when nothing is due.'
namespace: erru
params:
  messageTypes:
    type: string
returns:
- name: result
  type: string
*/
WITH due AS (
  SELECT id
    FROM erru.xml_inbox
   WHERE status = 'processing'
     AND claimed_by = 'erru-xml-adapter-xtr-async'
     AND next_attempt_at <= now()
     AND message_type = ANY (string_to_array(:messageTypes, ','))
   ORDER BY next_attempt_at, id
   LIMIT 1
   FOR UPDATE SKIP LOCKED
)
UPDATE erru.xml_inbox i
   SET claimed_by = 'erru-xml-adapter-xtr', claimed_at = now(), lease_expires_at = now() + interval '2 minutes',
       next_attempt_at = NULL, attempts = i.attempts + 1
  FROM due
 WHERE i.id = due.id
RETURNING json_build_object(
  'inboxId', i.id,
  'messageType', i.message_type,
  'attempts', i.attempts,
  'requestJson', i.request_json,
  'rawXml', i.raw_xml,
  'receivedAt', to_char(i.received_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'deadlineAtMs', (extract(epoch FROM i.deadline_at) * 1000)::bigint,
  'responseTechnicalId', overlay(overlay(md5('erru-response:' || i.id::text) placing '4' from 13) placing '8' from 17)::uuid,
  'errorTechnicalId', overlay(overlay(md5('erru-en:' || i.id::text) placing '4' from 13) placing '8' from 17)::uuid
)::text AS result;
