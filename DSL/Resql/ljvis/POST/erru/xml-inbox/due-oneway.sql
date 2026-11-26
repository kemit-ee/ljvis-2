/*
description: 'Recovery list for the one-way ERRU messages (acknowledgements and responses): the rows the XTR inbound flow sent back for a retry (status received with next_attempt_at due or unset, or processing with an expired xtr lease: the flow died mid-way; request_json stored, received more than 1 minute ago). Read only, nothing is claimed here: the cron replays each row through xtr/inbound/<message>, whose xml-inbox/accept takes the claim over (same technical_id and digest). Only rows whose current event is at most 6 hours old are scanned (an older open row needs a manual reset). Returns at most 3 JSON rows, oldest first.'
namespace: erru
params:
  messageTypes:
    type: string
returns:
- name: result
  type: string
*/
WITH open_latest AS MATERIALIZED (
  -- Same scan as xml-inbox/claim-due: the open events of the last 6 hours that are still the newest event of their row.
  SELECT e.inbox_id, e.next_attempt_at
    FROM erru.xml_inbox_event e
   WHERE e.event_type IN ('received', 'processing')
     AND e.created_at > now() - interval '6 hours'
     AND (
           (e.event_type = 'received' AND (e.next_attempt_at IS NULL OR e.next_attempt_at <= now()))
        OR (e.event_type = 'processing' AND e.claimed_by = 'erru-xml-adapter-xtr' AND e.lease_expires_at < now())
     )
     AND NOT EXISTS (SELECT 1 FROM erru.xml_inbox_event n WHERE n.inbox_id = e.inbox_id AND n.seq > e.seq)
)
SELECT json_build_object(
  'messageType', i.message_type,
  'requestJson', i.request_json,
  'rawXml', i.raw_xml,
  'sha256', i.payload_digest
)::text AS result
  FROM erru.xml_inbox i
 WHERE i.id = ANY (SELECT o.inbox_id FROM open_latest o)
   AND i.message_type = ANY (string_to_array(:messageTypes, ','))
   AND i.request_json IS NOT NULL
   AND i.received_at < now() - interval '1 minute'
 ORDER BY COALESCE((SELECT o.next_attempt_at FROM open_latest o WHERE o.inbox_id = i.id), i.received_at), i.id
 LIMIT 3;
