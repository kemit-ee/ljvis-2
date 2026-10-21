/*
description: 'Reserve one outgoing CGR dispatch. Persists technical_id, workflow_id and sent_at before the
  HTTP request. An empty targetMemberState reserves the original send (initiated or error -> sending).
  A member state code reserves a per-country resend of a sent or responded request: the status is kept,
  the workflow_id is preserved and a new technical_id is issued. Unsendable states yield no rows.'
namespace: erru
params:
  key:
    type: integer
  created_by:
    type: string
  tmFirstNameSearchKey:
    type: string
    required: false
  tmFamilyNameSearchKey:
    type: string
    required: false
  targetMemberState:
    type: string
    required: false
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
FROM erru.cgr_begin_send(:key::BIGINT, :created_by, :tmFirstNameSearchKey, :tmFamilyNameSearchKey, :targetMemberState);
