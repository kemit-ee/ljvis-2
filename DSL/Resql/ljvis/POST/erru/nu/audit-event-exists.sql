/*
description: >-
  Checks whether the NU inbound audit event already exists for a given nu_message_key,
  including legacy events written before the separate inbound audit deduplication table.
  inbound-request.yml uses this lookup to distinguish completed processing from side
  effects interrupted after the NU snapshots committed. Notification creation is
  idempotent via event_key / legacy-index and ON CONFLICT DO NOTHING. Correlation here
  uses log_content.nuMessageKey; audit_event has no foreign key to nu_message by design.
  This lookup is not a concurrency guard: new audit writes use erru.record_inbound_audit
  with a transaction lock and a separate stable deduplication key.
namespace: erru
params:
  message_key:
    type: string
    required: false
returns:
- name: exists
  type: boolean
  nullable: false
*/
SELECT EXISTS (
  SELECT 1 FROM audit.audit_event
  WHERE event_type = 'nu.inbound_request.store'
    AND log_content @> jsonb_build_object('nuMessageKey', :message_key::text)
) AS exists;
