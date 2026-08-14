/*
declaration:
  version: 0.1
  description: "Look up the LATEST snapshot of an OUTGOING NCR message by its workflowId
    (LJVIS2-64 §4.3). Used exclusively by inbound-response.yml to correlate the destination
    member state's asynchronous substantive response with the original outgoing request.
    The synchronous ack (sent->acknowledged) happens in the same call as the send; the
    substantive response (acknowledged->responded) arrives later, correlated only by the
    workflowId generated during 'sent'. Returns zero rows when no outgoing NCR message with
    this workflow_id exists — the caller treats that as an unknown/stale response and does
    not store anything (LJVIS2-64 §Testimine: 'Korreleerimata workflowId-ga vastust ei
    salvestata')."
  method: post
  accepts: json
  returns: json
  namespace: erru
  allowlist:
    body:
      - field: workflow_id
        type: string
  response:
    fields:
      - field: id
        type: number
      - field: version
        type: number
      - field: status
        type: string
      - field: direction
        type: string
      - field: business_case_id
        type: string
      - field: originating_authority
        type: string
      - field: transport_undertaking_name
        type: string
      - field: community_licence_number
        type: string
*/
SELECT
  ncr_message_key AS id,
  version,
  status,
  direction,
  business_case_id,
  originating_authority,
  transport_undertaking_name,
  community_licence_number
FROM erru.ncr_message
WHERE workflow_id = :workflow_id::UUID
  AND direction = 'outgoing'
ORDER BY created_at DESC
LIMIT 1;
