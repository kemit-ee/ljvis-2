/*
description: 'Postkast 2.0 saadetud kirjade logi (12-2 "Saadetud teavituste nimekirja vaatamine"). Üks rida = üks
  saatmiskatse = üks adressaat. Filtrid: status, notification_type, date_from/date_to (saatmise kuupäev), recipient
  (adressaat, sisaldab), notification_key (täpne). Sortimine: sort_by + sort_dir (whitelist Ruuter DSL-i tasemel,
  aga kaitstud siin ka CASE-iga kui väärtus ei sobi loendisse). Vaikimisi sorditud send_date DESC (12-2 §"Sortimine").
  Leheküljed: page + page_size. total sisaldab filtreerimata koguarvu. notification.list õiguse kontroll on Ruuter
  DSL-i tasemel. Praegune seis = viimane outbound_log_status_event rida (INSERT-only), ilma eventita outbound_log
  rida ise.'
namespace: notification
params:
  status:
    type: string
    required: false
  notification_type:
    type: string
    required: false
  date_from:
    type: string
    required: false
  date_to:
    type: string
    required: false
  recipient:
    type: string
    required: false
  notification_key:
    type: string
    required: false
  related_entity_type:
    type: string
    required: false
  related_entity_id:
    type: string
    required: false
  sort_by:
    type: string
    required: false
  sort_dir:
    type: string
    required: false
  page:
    type: integer
    required: false
  page_size:
    type: integer
    required: false
*/
WITH cur AS (
  SELECT
    ol.id, ol.notification_key, ol.message_type, ol.send_date, ol.recipient_address,
    ol.related_entity_type, ol.related_entity_id, ol.original_log_id, ol.pk_template_id,
    ol.status, ol.failure_reason, ol.pk_sending_operation_id, ol.pk_operation_restart_allowed, ol.pk_completed_at,
    (SELECT e FROM notifications.outbound_log_status_event e WHERE e.log_id = ol.id ORDER BY e.revision DESC LIMIT 1) AS ev
  FROM notifications.outbound_log ol
  WHERE (NULLIF(:notification_type, '') IS NULL OR ol.message_type = :notification_type)
  -- escape LIKE-metamärgid (\ % _) kasutaja sisendis, et '_' / '%' oleks
  -- literaalne (e-posti aadressides on '_' tavaline)
  AND (NULLIF(:recipient, '') IS NULL
       OR ol.recipient_address ILIKE '%' ||
          replace(replace(replace(:recipient, '\', '\\'), '%', '\%'), '_', '\_')
          || '%' ESCAPE '\')
  AND (NULLIF(:notification_key, '') IS NULL OR ol.notification_key = :notification_key)
  AND (NULLIF(:related_entity_type, '') IS NULL OR ol.related_entity_type = :related_entity_type)
  AND (NULLIF(:related_entity_id, '') IS NULL OR ol.related_entity_id = :related_entity_id)
  AND ol.send_date >= COALESCE(NULLIF(:date_from, '')::TIMESTAMPTZ, '-infinity'::TIMESTAMPTZ)
  AND ol.send_date <  COALESCE(NULLIF(:date_to, '')::TIMESTAMPTZ + INTERVAL '1 day', 'infinity'::TIMESTAMPTZ)
),
eff AS (
  SELECT
    c.id, c.notification_key, c.message_type, c.send_date, c.recipient_address,
    c.related_entity_type, c.related_entity_id, c.original_log_id, c.pk_template_id,
    CASE WHEN (c.ev).id IS NULL THEN c.status ELSE (c.ev).status END AS status,
    CASE WHEN (c.ev).id IS NULL THEN c.failure_reason ELSE (c.ev).failure_reason END AS failure_reason,
    CASE WHEN (c.ev).id IS NULL THEN c.pk_sending_operation_id ELSE (c.ev).pk_sending_operation_id END AS pk_sending_operation_id,
    CASE WHEN (c.ev).id IS NULL THEN c.pk_operation_restart_allowed ELSE (c.ev).pk_operation_restart_allowed END AS pk_operation_restart_allowed,
    CASE WHEN (c.ev).id IS NULL THEN c.pk_completed_at ELSE (c.ev).pk_completed_at END AS pk_completed_at
  FROM cur c
)
SELECT
    e.id,
    e.notification_key,
    e.message_type AS notification_type,
    e.send_date,
    e.status,
    e.recipient_address,
    e.failure_reason,
    e.related_entity_type,
    e.related_entity_id,
    e.original_log_id,
    e.pk_template_id,
    e.pk_sending_operation_id,
    e.pk_operation_restart_allowed,
    e.pk_completed_at,
    (COUNT(*) OVER ())::INTEGER AS total
FROM eff e
WHERE (NULLIF(:status, '') IS NULL OR e.status = :status)
ORDER BY
    CASE WHEN :sort_by = 'notification_type'   AND :sort_dir = 'asc'  THEN e.message_type END ASC,
    CASE WHEN :sort_by = 'notification_type'   AND :sort_dir = 'desc' THEN e.message_type END DESC,
    CASE WHEN :sort_by = 'recipient_address'   AND :sort_dir = 'asc'  THEN e.recipient_address END ASC,
    CASE WHEN :sort_by = 'recipient_address'   AND :sort_dir = 'desc' THEN e.recipient_address END DESC,
    CASE WHEN :sort_by = 'notification_key'    AND :sort_dir = 'asc'  THEN e.notification_key END ASC,
    CASE WHEN :sort_by = 'notification_key'    AND :sort_dir = 'desc' THEN e.notification_key END DESC,
    CASE WHEN :sort_by = 'status'               AND :sort_dir = 'asc'  THEN e.status END ASC,
    CASE WHEN :sort_by = 'status'               AND :sort_dir = 'desc' THEN e.status END DESC,
    CASE WHEN :sort_by = 'send_date'            AND :sort_dir = 'asc'  THEN e.send_date END ASC,
    CASE WHEN COALESCE(NULLIF(:sort_by, ''), 'send_date') = 'send_date'
              AND COALESCE(NULLIF(:sort_dir, ''), 'desc') = 'desc' THEN e.send_date END DESC,
    e.send_date DESC
LIMIT  COALESCE(NULLIF(:page_size::TEXT, ''), '20')::INTEGER
OFFSET ((GREATEST(COALESCE(NULLIF(:page::TEXT, ''), '1')::INTEGER, 1) - 1)
         * COALESCE(NULLIF(:page_size::TEXT, ''), '20')::INTEGER);
