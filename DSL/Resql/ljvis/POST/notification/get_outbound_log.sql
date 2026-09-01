/*
declaration:
  version: 0.1
  description: "Single Postkast 2.0 outbound_log row by id. Used by UC-04 resend (resend.yml) to load the original send attempt it is retrying."
  method: post
  accepts: json
  returns: json
  namespace: notification
  allowlist:
    body:
      - field: id
        type: string
        description: "outbound_log id"
  response:
    fields:
      - field: id
        type: string
      - field: message_type
        type: string
      - field: status
        type: string
      - field: related_entity_type
        type: string
      - field: related_entity_id
        type: string
      - field: original_log_id
        type: string
      - field: pk_template_id
        type: string
      - field: pk_sending_operation_id
        type: string
*/
SELECT
    ol.id,
    ol.message_type,
    ol.status,
    ol.related_entity_type,
    ol.related_entity_id,
    ol.original_log_id,
    ol.pk_template_id,
    ol.pk_sending_operation_id
FROM notifications.outbound_log ol
WHERE ol.id = :id::UUID;
