/*
description: "Look up the LATEST snapshot of an OUTGOING NCR message by its workflowId (LJVIS2-64 §4.3). Used exclusively by inbound-response.yml to correlate the destination member state's asynchronous substantive response with the original outgoing request. The synchronous ack (sent->acknowledged) happens in the same call as the send; the substantive response (acknowledged->responded) arrives later, correlated only by the workflowId generated during 'sent'. Returns zero rows when no outgoing NCR message with this workflow_id exists — the caller treats that as an unknown/stale response and does not store anything (LJVIS2-64 §Testimine: 'Korreleerimata workflowId-ga vastust ei salvestata')."
namespace: erru
params:
  workflow_id:
    type: string
    required: false
returns:
  - name: id
    type: number
    nullable: true
  - name: version
    type: number
    nullable: true
  - name: status
    type: string
    nullable: true
  - name: direction
    type: string
    nullable: true
  - name: business_case_id
    type: string
    nullable: true
  - name: originating_authority
    type: string
    nullable: true
  - name: transport_undertaking_name
    type: string
    nullable: true
  - name: community_licence_number
    type: string
    nullable: true
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
