/*
description: 'Reserve one outgoing CTUD dispatch (initiated or error -> sending). Persists technical_id,
  workflow_id and sent_at before the HTTP request. A retry after a definite rejection keeps the
  workflow_id and takes a new technical_id. Unsendable states yield no rows.'
namespace: erru
params:
  key:
    type: integer
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
FROM erru.ctud_begin_send(:key::BIGINT, :created_by);
