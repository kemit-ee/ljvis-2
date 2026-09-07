/*
description: Ühe outbound_log kirje saajate loend (UC-03). Eraldi kutse, mitte JOIN list_outbound_log.sql-iga
  (JOIN keelatud). notification.list õiguse kontroll on Ruuter DSL-i tasemel.
namespace: notification
params:
  log_id:
    type: string
    required: false
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
