/*
description: 'Closes the claim taken by xml-inbox/accept: processed (business effects done), requeue (async rows only: back to the async cron worker queue, due in 30 s), retry (back to received, the Hub redelivers or the Java adapter worker may pick it up) or failed (attempt budget exhausted, needs manual recovery). Only the claim holder (claimed_by erru-xml-adapter-xtr, status processing, and when attempts is given the same attempt number: a fencing token against a slower earlier attempt) may finish. Returns the new status, or no row when the claim was lost.'
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
UPDATE erru.xml_inbox
   SET status = CASE :outcome WHEN 'processed' THEN 'processed' WHEN 'failed' THEN 'failed' WHEN 'requeue' THEN 'processing' ELSE 'received' END,
       last_error = CASE :outcome WHEN 'processed' THEN NULL ELSE :error END,
       claimed_by = CASE WHEN :outcome = 'requeue' THEN 'erru-xml-adapter-xtr-async' END,
       lease_expires_at = CASE WHEN :outcome = 'requeue' THEN now() + interval '10 minutes' END,
       next_attempt_at = CASE WHEN :outcome = 'requeue' THEN now() + interval '30 seconds' END
 WHERE id = :inboxId
   AND claimed_by = 'erru-xml-adapter-xtr'
   AND status = 'processing'
   AND (:attempts::int IS NULL OR attempts = :attempts::int)
RETURNING status;
