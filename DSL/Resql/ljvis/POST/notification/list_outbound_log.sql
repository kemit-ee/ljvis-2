/*
declaration:
  version: 0.1
  description: >-
    Postkast 2.0 saadetud kirjade logi (UC-02).
    Filtrid: status, message_type, date_from.
    Ainult viimased 6 kuud vaikimisi.
    Leheküljed: page + page_size.
    total sisaldab filtreerimata koguarvu.
    notification.admin õiguse kontroll on Ruuter DSL-i tasemel.
  method: post
  accepts: json
  returns: json
  namespace: notification
  allowlist:
    body:
      - field: status
        type: string
      - field: message_type
        type: string
      - field: date_from
        type: string
      - field: page
        type: integer
      - field: page_size
        type: integer
*/
SELECT
    ol.id,
    ol.message_type,
    ol.send_date,
    ol.status,
    ol.related_entity_type,
    ol.related_entity_id,
    ol.original_log_id,
    ol.pk_template_id,
    ol.pk_sending_operation_id,
    (COUNT(*) OVER ())::INTEGER AS total
FROM notifications.outbound_log ol
WHERE (NULLIF(:status, '') IS NULL OR ol.status = :status)
  AND (NULLIF(:message_type, '') IS NULL OR ol.message_type = :message_type)
  AND ol.send_date >= COALESCE(
        NULLIF(:date_from, '')::TIMESTAMPTZ,
        now() - INTERVAL '6 months'
      )
ORDER BY ol.send_date DESC
LIMIT  COALESCE(NULLIF(:page_size::TEXT, ''), '20')::INTEGER
OFFSET ((GREATEST(COALESCE(NULLIF(:page::TEXT, ''), '1')::INTEGER, 1) - 1)
         * COALESCE(NULLIF(:page_size::TEXT, ''), '20')::INTEGER);
