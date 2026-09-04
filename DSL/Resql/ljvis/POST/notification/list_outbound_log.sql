/*
declaration:
  version: 0.2
  description: >-
    Postkast 2.0 saadetud kirjade logi (12-2 "Saadetud teavituste nimekirja
    vaatamine"). Üks rida = üks saatmiskatse = üks adressaat.
    Filtrid: status, notification_type, date_from/date_to (saatmise kuupäev),
    recipient (adressaat, sisaldab), notification_key (täpne).
    Sortimine: sort_by + sort_dir (whitelist Ruuter DSL-i tasemel, aga
    kaitstud siin ka CASE-iga kui väärtus ei sobi loendisse).
    Vaikimisi sorditud send_date DESC (12-2 §"Sortimine").
    Leheküljed: page + page_size. total sisaldab filtreerimata koguarvu.
    notification.list õiguse kontroll on Ruuter DSL-i tasemel.
  method: post
  accepts: json
  returns: json
  namespace: notification
  allowlist:
    body:
      - field: status
        type: string
      - field: notification_type
        type: string
      - field: date_from
        type: string
      - field: date_to
        type: string
      - field: recipient
        type: string
      - field: notification_key
        type: string
      - field: sort_by
        type: string
      - field: sort_dir
        type: string
      - field: page
        type: integer
      - field: page_size
        type: integer
*/
SELECT
    ol.id,
    ol.notification_key,
    ol.message_type AS notification_type,
    ol.send_date,
    ol.status,
    ol.recipient_address,
    ol.failure_reason,
    ol.related_entity_type,
    ol.related_entity_id,
    ol.original_log_id,
    ol.pk_template_id,
    ol.pk_sending_operation_id,
    ol.pk_operation_restart_allowed,
    ol.pk_completed_at,
    (COUNT(*) OVER ())::INTEGER AS total
FROM notifications.outbound_log ol
WHERE (NULLIF(:status, '') IS NULL OR ol.status = :status)
  AND (NULLIF(:notification_type, '') IS NULL OR ol.message_type = :notification_type)
  AND (NULLIF(:recipient, '') IS NULL OR ol.recipient_address ILIKE '%' || :recipient || '%')
  AND (NULLIF(:notification_key, '') IS NULL OR ol.notification_key = :notification_key)
  AND ol.send_date >= COALESCE(NULLIF(:date_from, '')::TIMESTAMPTZ, '-infinity'::TIMESTAMPTZ)
  AND ol.send_date <  COALESCE(NULLIF(:date_to, '')::TIMESTAMPTZ + INTERVAL '1 day', 'infinity'::TIMESTAMPTZ)
ORDER BY
    CASE WHEN :sort_by = 'notification_type'   AND :sort_dir = 'asc'  THEN ol.message_type END ASC,
    CASE WHEN :sort_by = 'notification_type'   AND :sort_dir = 'desc' THEN ol.message_type END DESC,
    CASE WHEN :sort_by = 'recipient_address'   AND :sort_dir = 'asc'  THEN ol.recipient_address END ASC,
    CASE WHEN :sort_by = 'recipient_address'   AND :sort_dir = 'desc' THEN ol.recipient_address END DESC,
    CASE WHEN :sort_by = 'notification_key'    AND :sort_dir = 'asc'  THEN ol.notification_key END ASC,
    CASE WHEN :sort_by = 'notification_key'    AND :sort_dir = 'desc' THEN ol.notification_key END DESC,
    CASE WHEN :sort_by = 'status'               AND :sort_dir = 'asc'  THEN ol.status END ASC,
    CASE WHEN :sort_by = 'status'               AND :sort_dir = 'desc' THEN ol.status END DESC,
    CASE WHEN :sort_by = 'send_date'            AND :sort_dir = 'asc'  THEN ol.send_date END ASC,
    CASE WHEN COALESCE(NULLIF(:sort_by, ''), 'send_date') = 'send_date'
              AND COALESCE(NULLIF(:sort_dir, ''), 'desc') = 'desc' THEN ol.send_date END DESC,
    ol.send_date DESC
LIMIT  COALESCE(NULLIF(:page_size::TEXT, ''), '20')::INTEGER
OFFSET ((GREATEST(COALESCE(NULLIF(:page::TEXT, ''), '1')::INTEGER, 1) - 1)
         * COALESCE(NULLIF(:page_size::TEXT, ''), '20')::INTEGER);
