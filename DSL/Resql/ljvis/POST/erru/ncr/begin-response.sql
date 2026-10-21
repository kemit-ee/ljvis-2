/*
description: 'Reserve the response to an INCOMING NCR (answer_drafted or error -> sending). The incoming message keeps its technical_id and workflow_id; the response gets a new technicalId. Unsendable states yield no rows.'
namespace: erru
params:
  businessCaseId:
    type: string
  created_by:
    type: string
returns:
- name: technical_id
  type: string
- name: workflow_id
  type: string
- name: sent_at
  type: string
- name: status
  type: string
- name: version
  type: number
*/
SELECT technical_id, workflow_id, sent_at, status, version
FROM erru.ncr_begin_response(:businessCaseId, :created_by);
