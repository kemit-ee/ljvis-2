/*
description: 'Reserve one outgoing NCR request (initiated or error -> sending). Persists technical_id, workflow_id and sent_at before the HTTP request. Unsendable states yield no rows.'
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
FROM erru.ncr_begin_send(:businessCaseId, :created_by);
