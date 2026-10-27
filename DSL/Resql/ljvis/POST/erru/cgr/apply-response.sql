/*
description: 'Merge an asynchronous CheckGoodRepute_Response into the outgoing request identified by
  workflowId. Entries are replaced per memberStateCode, so each responding member state adds its own
  entry. Returns zero rows when the workflow is unknown, not in a state that accepts answers, or the
  replayed content is identical to what is stored.'
namespace: erru
params:
  workflowId:
    type: string
  memberStates:
    type: string
returns:
- name: id
  type: number
- name: business_case_id
  type: string
- name: version
  type: number
- name: status
  type: string
- name: workflow_id
  type: string
*/
SELECT id, business_case_id, version, status, workflow_id
FROM erru.cgr_apply_response(:workflowId::UUID, :memberStates::JSONB);
