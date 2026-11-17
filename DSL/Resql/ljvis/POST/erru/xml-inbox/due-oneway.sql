/*
description: 'Recovery list for the one-way ERRU messages (acknowledgements and responses): the rows the XTR inbound flow sent back for a retry (status received, request_json stored, next_attempt_at due or unset and received more than 1 minute ago). Read only, nothing is claimed here: the cron replays each row through xtr/inbound/<message>, whose xml-inbox/accept takes the claim over (same technical_id and digest). Returns at most 3 JSON rows, oldest first.'
namespace: erru
params:
  messageTypes:
    type: string
returns:
- name: result
  type: string
*/
SELECT json_build_object(
  'messageType', message_type,
  'requestJson', request_json,
  'rawXml', raw_xml,
  'sha256', payload_digest
)::text AS result
  FROM erru.xml_inbox
 WHERE message_type = ANY (string_to_array(:messageTypes, ','))
   AND status = 'received'
   AND request_json IS NOT NULL
   AND received_at < now() - interval '1 minute'
   AND (next_attempt_at IS NULL OR next_attempt_at <= now())
 ORDER BY COALESCE(next_attempt_at, received_at), id
 LIMIT 3;
