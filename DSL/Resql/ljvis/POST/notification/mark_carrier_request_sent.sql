/*
description: 'Märgib vedaja teavituse tellimuse saadetuks (linnuke tarbitud). INSERT-only: lisab sama entity jaoks
  uue rea (revision + 1, sent_at = now()), avatud rida jääb muutmata. Kui :id ei ole entity avatud viimane rida
  (juba saadetud või uuem tellimus olemas), ei lisata midagi (0 rida).'
namespace: notification
params:
  id:
    type: integer
    required: true
returns:
- name: id
  type: number
  nullable: true
*/
WITH req AS (
  SELECT id, entity_type, entity_id, requested_by, requested_at
  FROM notifications.carrier_notification_request
  WHERE id = :id::BIGINT
),
latest AS (
  SELECT id, revision, sent_at
  FROM notifications.carrier_notification_request
  WHERE entity_type = (SELECT entity_type FROM req)
    AND entity_id = (SELECT entity_id FROM req)
  ORDER BY revision DESC
  LIMIT 1
)
INSERT INTO notifications.carrier_notification_request (entity_type, entity_id, requested_by, requested_at, sent_at, revision)
SELECT r.entity_type, r.entity_id, r.requested_by, r.requested_at, now(), (SELECT revision FROM latest) + 1
FROM req r
WHERE (SELECT id FROM latest) = r.id
  AND (SELECT sent_at FROM latest) IS NULL
RETURNING id;
