/*
description: 'Tagastab kõik lugemata teavituste id-d kasutaja jaoks. Kasutatakse mark-all-read voos: Ruuter
  itereerib üle id-de ja kutsub mark_notification_read iga kirje kohta eraldi. NOT EXISTS subpäring (JOIN
  keelatud).'
namespace: notification
params:
  user_code:
    type: string
    required: false
  permissions:
    type: string
    required: false
*/
SELECT n.id
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
ORDER BY n.created_at DESC;
