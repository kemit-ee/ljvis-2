/*
description: 'Vormi avatud (saatmata) vedaja teavituse tellimus: entity viimane rida (suurim revision), kui selle
  sent_at on NULL.'
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
SELECT latest.id, latest.requested_by
FROM (
  SELECT id, requested_by, sent_at
  FROM notifications.carrier_notification_request
  WHERE entity_type = :entity_type
    AND entity_id = :entity_id::BIGINT
  ORDER BY revision DESC
  LIMIT 1
) latest
WHERE latest.sent_at IS NULL;
