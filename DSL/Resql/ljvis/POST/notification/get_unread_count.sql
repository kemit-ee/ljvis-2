/*
description: Lugemata teavituste arv kasutaja õiguste alusel. NOT EXISTS subpäring notification_read vastu
  (JOIN keelatud). Kasutatakse kelluke-badge'i arvu kuvamiseks päises.
namespace: notification
params:
  user_code:
    type: string
    required: false
  permissions:
    type: string
    required: false
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
