/*
description: Märgib vedaja teavituse tellimuse saadetuks (linnuke tarbitud).
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
UPDATE notifications.carrier_notification_request
SET sent_at = now()
WHERE id = :id::BIGINT
  AND sent_at IS NULL
RETURNING id;
