/*
description: 'Märgib ühe teavituse kasutaja jaoks loetuks. Idempotentne: INSERT ON CONFLICT DO NOTHING.
  APPEND-ONLY: lugemist ei saa tagasi võtta.'
namespace: notification
params:
  notification_id:
    type: string
    required: false
  user_code:
    type: string
    required: false
*/
INSERT INTO notifications.notification_read (notification_id, user_code)
VALUES (:notification_id::UUID, :user_code)
ON CONFLICT DO NOTHING
RETURNING notification_id, user_code, read_at;
