/*
description: 'Märgib kõik kasutajale nähtavad lugemata teavitused loetuks ühe päringuga.
  Lisab ainult lugemise sündmused. Korduv päring ei lisa duplikaate.'
namespace: notification
params:
  user_code:
    type: string
    required: false
  permissions:
    type: string
    required: false
*/
WITH marked AS (
    INSERT INTO notifications.notification_read (notification_id, user_code)
    SELECT n.id, :user_code
    FROM notifications.notification n
    WHERE (
        (NOT n.recipients_only AND n.required_permission = ANY (string_to_array(:permissions, ',')))
        OR n.recipient_personal_codes @> ARRAY[:user_code]::TEXT[]
      )
      AND NOT EXISTS (
          SELECT 1
          FROM notifications.notification_read nr
          WHERE nr.notification_id = n.id
            AND nr.user_code = :user_code
      )
    ON CONFLICT DO NOTHING
    RETURNING notification_id
)
SELECT COUNT(*)::INTEGER AS marked_count FROM marked;
