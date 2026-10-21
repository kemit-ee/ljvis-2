/*
description: 'Look up the LATEST snapshot with a given workflowId in either direction. Used by the inbound acknowledgement handler: NCRN_Ack refers to our outgoing request, NCRR_Ack to the response we sent for an incoming message (both carry the workflowId of the original request). Zero rows means an unknown workflow.'
namespace: erru
params:
  workflow_id:
    type: string
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
*/
SELECT ncr_message_key AS id, version, status, direction, business_case_id
FROM erru.ncr_message
WHERE workflow_id = :workflow_id::UUID
ORDER BY created_at DESC, id DESC
LIMIT 1;
