/*
declaration:
  version: 0.1
  description: >-
    Lugemata teavituste arv kasutaja õiguste alusel.
    NOT EXISTS subpäring notification_read vastu (JOIN keelatud).
    Kasutatakse kelluke-badge'i arvu kuvamiseks päises.
  method: post
  accepts: json
  returns: json
  namespace: notification
  allowlist:
    body:
      - field: user_code
        type: string
      - field: permissions
        type: string
*/
SELECT COUNT(*)::INTEGER AS unread_count
FROM notifications.notification n
WHERE n.required_permission = ANY (string_to_array(:permissions, ','))
  AND NOT EXISTS (
      SELECT 1
      FROM notifications.notification_read nr
      WHERE nr.notification_id = n.id
        AND nr.user_code = :user_code
  );
