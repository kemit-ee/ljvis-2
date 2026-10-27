/*
description: 'Reserve one RSI send. Persist identifiers before the HTTP request. Stale versions yield no rows.'
namespace: erru
params:
  key:
    type: integer
  expectedVersion:
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
*/
SELECT technical_id, workflow_id, sent_at FROM erru.rsi_begin_send(:key::BIGINT, :expectedVersion::INTEGER, :created_by);
