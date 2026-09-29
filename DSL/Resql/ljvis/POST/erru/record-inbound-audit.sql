/*
description: 'Idempotent audit for completed NU/NCR/RSI inbound handling. Deduplicates before the audit hash-chain trigger.'
namespace: erru
params:
  event_type:
    type: string
    required: true
  message_key:
    type: string
    required: true
  description:
    type: string
    required: true
  log_content:
    type: string
    required: true
returns:
- name: event_id
  type: string
  nullable: false
*/
SELECT erru.record_inbound_audit(:event_type, :message_key::BIGINT, :description, :log_content::JSONB) AS event_id;
