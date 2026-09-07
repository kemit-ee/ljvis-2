/*
description: Teavitused, mille Postkast 2.0 saatmisoperatsioon pole veel lõppstaatuses (queued/in_progress).
  Kasutab cron/notification-status-sync.yml, mis pärib iga rea kohta PK 2.0-st saatmisoperatsiooni seisu
  (X-tee). LIMIT piirab ühe cron-käivituse koormust.
namespace: notification
params:
  limit:
    type: integer
    required: false
*/
SELECT
    ol.id,
    ol.notification_key,
    ol.status,
    ol.pk_sending_operation_id,
    ol.send_date,
    ol.status_check_count
FROM notifications.outbound_log ol
WHERE ol.status IN ('queued', 'in_progress')
ORDER BY ol.send_date ASC
LIMIT COALESCE(NULLIF(:limit::TEXT, ''), '200')::INTEGER;
