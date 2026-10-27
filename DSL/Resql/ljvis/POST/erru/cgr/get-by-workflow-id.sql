/*
description: 'Look up the LATEST snapshot of an OUTGOING CGR request by workflowId. Used by the inbound
  response handler to correlate an asynchronous CheckGoodRepute_Response with the original send.
  Zero rows means an unknown or spurious workflow.'
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
- name: business_case_id
  type: string
  nullable: true
*/
SELECT cgr_request_key AS id, version, status, business_case_id
FROM erru.cgr_request
WHERE workflow_id = :workflow_id::UUID
  AND direction = 'outgoing'
ORDER BY created_at DESC, id DESC
LIMIT 1;
