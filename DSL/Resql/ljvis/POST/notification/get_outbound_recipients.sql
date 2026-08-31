/*
declaration:
  version: 0.1
  description: >-
    Ühe outbound_log kirje saajate loend (UC-03).
    Eraldi kutse, mitte JOIN list_outbound_log.sql-iga (JOIN keelatud).
    notification.admin õiguse kontroll on Ruuter DSL-i tasemel.
  method: post
  accepts: json
  returns: json
  namespace: notification
  allowlist:
    body:
      - field: log_id
        type: string
*/
SELECT
    r.id,
    r.log_id,
    r.person_email,
    r.person_name,
    r.person_code,
    r.sending_report
FROM notifications.outbound_log_recipient r
WHERE r.log_id = :log_id::UUID
ORDER BY r.id;
