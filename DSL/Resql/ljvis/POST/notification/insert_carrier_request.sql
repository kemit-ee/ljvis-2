/*
description: 'Registreerib vormi kinnitamisel märgitud vedaja teavituse tellimuse. Idempotentne — vormil on korraga
  üks avatud (saatmata) tellimus: kui entity viimane rida on avatud, ei lisata midagi; samaaegse topelttellimuse
  korral võidab üks (UNIQUE entity_type, entity_id, revision).'
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
WITH latest AS (
  SELECT revision, sent_at
  FROM notifications.carrier_notification_request
  WHERE entity_type = :entity_type
    AND entity_id = :entity_id::BIGINT
  ORDER BY revision DESC
  LIMIT 1
)
INSERT INTO notifications.carrier_notification_request (entity_type, entity_id, requested_by, revision)
SELECT :entity_type,
       :entity_id::BIGINT,
       COALESCE(NULLIF(:requested_by, ''), 'system'),
       COALESCE((SELECT revision FROM latest), 0) + 1
WHERE NOT EXISTS (SELECT 1 FROM latest WHERE sent_at IS NULL)
ON CONFLICT (entity_type, entity_id, revision) DO NOTHING
RETURNING id;
