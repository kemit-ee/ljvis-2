/*
description: Teavitused, mille Postkast 2.0 saatmisoperatsioon pole veel lõppstaatuses (queued/in_progress). Kasutab
  cron/notification-status-sync.yml, mis pärib iga rea kohta PK 2.0-st saatmisoperatsiooni seisu (X-tee). LIMIT
  piirab ühe cron-käivituse koormust. Praegune seis = viimane outbound_log_status_event rida (INSERT-only), ilma
  eventita outbound_log rida ise.
namespace: notification
params:
  limit:
    type: integer
    required: false
*/
WITH cur AS (
  SELECT
    ol.id, ol.notification_key, ol.send_date,
    ol.status, ol.pk_sending_operation_id, ol.status_check_count,
    (SELECT e FROM notifications.outbound_log_status_event e WHERE e.log_id = ol.id ORDER BY e.revision DESC LIMIT 1) AS ev
  FROM notifications.outbound_log ol
),
eff AS (
  SELECT
    c.id,
    c.notification_key,
    CASE WHEN (c.ev).id IS NULL THEN c.status ELSE (c.ev).status END AS status,
    CASE WHEN (c.ev).id IS NULL THEN c.pk_sending_operation_id ELSE (c.ev).pk_sending_operation_id END AS pk_sending_operation_id,
    c.send_date,
    CASE WHEN (c.ev).id IS NULL THEN c.status_check_count ELSE (c.ev).status_check_count END AS status_check_count
  FROM cur c
)
SELECT id, notification_key, status, pk_sending_operation_id, send_date, status_check_count
FROM eff
WHERE status IN ('queued', 'in_progress')
ORDER BY send_date ASC
LIMIT COALESCE(NULLIF(:limit::TEXT, ''), '200')::INTEGER;
