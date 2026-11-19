/*
description: 'Closes the claim taken by xml-inbox/accept (a new event, compare-and-swap on seq, fenced by the attempts of the claim): processed (business effects done), requeue (async rows only: back to the async cron worker queue, due in 30 s), retry (back to received, due in 30 s: the Hub redelivers, or the XTR recovery cron / the Java adapter worker picks it up) or failed (attempt budget exhausted, needs manual recovery). Only the claim holder (claimed_by erru-xml-adapter-xtr, status processing, and when attempts is given the same attempt number: a fencing token against a slower earlier attempt) may finish. Returns the new status, or no row when the claim was lost.'
namespace: erru
params:
  inboxId:
    type: number
  outcome:
    type: string
  attempts:
    type: number
    required: false
  error:
    type: string
    required: false
returns:
- name: status
  type: string
*/
WITH cur AS (
  SELECT seq, attempts
    FROM erru.xml_inbox_current
   WHERE id = :inboxId
     AND claimed_by = 'erru-xml-adapter-xtr'
     AND status = 'processing'
     AND (:attempts::int IS NULL OR attempts = :attempts::int)
),
closed AS (
  INSERT INTO erru.xml_inbox_event (inbox_id, seq, event_type, attempts, claimed_by, lease_expires_at, next_attempt_at, error)
  SELECT :inboxId::bigint, c.seq + 1,
         CASE :outcome WHEN 'processed' THEN 'processed' WHEN 'failed' THEN 'failed' WHEN 'requeue' THEN 'processing' ELSE 'received' END,
         c.attempts,
         CASE WHEN :outcome = 'requeue' THEN 'erru-xml-adapter-xtr-async' END,
         CASE WHEN :outcome = 'requeue' THEN now() + interval '10 minutes' END,
         CASE WHEN :outcome IN ('requeue', 'retry') THEN now() + interval '30 seconds' END,
         NULLIF(:error, '')
    FROM cur c
  ON CONFLICT (inbox_id, seq) DO NOTHING
  RETURNING event_type
)
SELECT event_type AS status FROM closed;
