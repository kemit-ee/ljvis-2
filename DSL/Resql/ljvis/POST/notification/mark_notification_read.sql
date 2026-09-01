/*
declaration:
  version: 0.1
  description: >-
    Märgib ühe teavituse kasutaja jaoks loetuks.
    Idempotentne: INSERT ON CONFLICT DO NOTHING.
    APPEND-ONLY: lugemist ei saa tagasi võtta.
  method: post
  accepts: json
  returns: json
  namespace: notification
  allowlist:
    body:
      - field: notification_id
        type: string
      - field: user_code
        type: string
*/
INSERT INTO notifications.notification_read (notification_id, user_code)
VALUES (:notification_id::UUID, :user_code)
ON CONFLICT DO NOTHING
RETURNING notification_id, user_code, read_at;
