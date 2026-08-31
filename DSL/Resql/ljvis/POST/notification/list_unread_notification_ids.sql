/*
declaration:
  version: 0.1
  description: >-
    Tagastab kõik lugemata teavituste id-d kasutaja jaoks.
    Kasutatakse mark-all-read voos: Ruuter itereerib üle id-de
    ja kutsub mark_notification_read iga kirje kohta eraldi.
    NOT EXISTS subpäring (JOIN keelatud).
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
SELECT n.id
FROM notifications.notification n
WHERE n.required_permission = ANY (string_to_array(:permissions, ','))
  AND NOT EXISTS (
      SELECT 1
      FROM notifications.notification_read nr
      WHERE nr.notification_id = n.id
        AND nr.user_code = :user_code
  )
ORDER BY n.created_at DESC;
