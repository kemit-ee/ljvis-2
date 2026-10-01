/*
description: Registreerib vormi kinnitamisel märgitud vedaja teavituse tellimuse. Idempotentne — vormil on
  korraga üks avatud (saatmata) tellimus.
namespace: notification
params:
  entity_type:
    type: string
    required: true
  entity_id:
    type: integer
    required: true
  requested_by:
    type: string
    required: false
returns:
- name: id
  type: number
  nullable: true
*/
INSERT INTO notifications.carrier_notification_request (entity_type, entity_id, requested_by)
VALUES (:entity_type, :entity_id::BIGINT, COALESCE(NULLIF(:requested_by, ''), 'system'))
ON CONFLICT (entity_type, entity_id) WHERE sent_at IS NULL DO NOTHING
RETURNING id;
