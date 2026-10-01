/*
description: Vormi avatud (saatmata) vedaja teavituse tellimus.
namespace: notification
params:
  entity_type:
    type: string
    required: true
  entity_id:
    type: integer
    required: true
returns:
- name: id
  type: number
  nullable: true
- name: requestedBy
  type: string
  nullable: true
*/
SELECT id, requested_by
FROM notifications.carrier_notification_request
WHERE entity_type = :entity_type
  AND entity_id = :entity_id::BIGINT
  AND sent_at IS NULL
LIMIT 1;
