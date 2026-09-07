/*
description: Teavituste nimekiri kasutaja õiguste alusel, lehe kaupa. is_unread arvutatakse NOT EXISTS
  subpäringu kaudu (JOIN keelatud). total sisaldab filtreerimata koguarvu (COUNT OVER window). Sorteeritud
  created_at DESC (uuemad ees).
namespace: notification
params:
  user_code:
    type: string
    required: false
  permissions:
    type: string
    required: false
  page:
    type: integer
    required: false
  page_size:
    type: integer
    required: false
*/
SELECT
    n.id,
    n.type,
    n.required_permission,
    n.related_entity_type,
    n.related_entity_id,
    n.title_et,
    n.body_et,
    n.created_at,
    NOT EXISTS (
        SELECT 1
        FROM notifications.notification_read nr
        WHERE nr.notification_id = n.id
          AND nr.user_code = :user_code
    ) AS is_unread,
    (COUNT(*) OVER ())::INTEGER AS total
FROM notifications.notification n
WHERE n.required_permission = ANY (string_to_array(:permissions, ','))
ORDER BY n.created_at DESC
LIMIT  COALESCE(NULLIF(:page_size::TEXT, ''), '20')::INTEGER
OFFSET ((GREATEST(COALESCE(NULLIF(:page::TEXT, ''), '1')::INTEGER, 1) - 1)
         * COALESCE(NULLIF(:page_size::TEXT, ''), '20')::INTEGER);
