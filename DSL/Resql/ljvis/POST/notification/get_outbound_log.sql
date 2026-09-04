/*
declaration:
  version: 0.2
  description: >-
    Single Postkast 2.0 outbound_log row by id. Used by UC-04 resend
    (resend.yml) to load the original send attempt it is retrying — reads
    recipient_address + template_variables + notification_type unchanged.
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
      - field: notificationKey
        type: string
      - field: notificationType
        type: string
      - field: status
        type: string
      - field: recipientAddress
        type: string
      - field: notificationLanguage
        type: string
      - field: templateVariables
        type: json
      - field: failureReason
        type: string
      - field: relatedEntityType
        type: string
      - field: relatedEntityId
        type: string
      - field: originalLogId
        type: string
      - field: pkTemplateId
        type: string
      - field: pkSendingOperationId
        type: string
*/
SELECT
    ol.id,
    ol.notification_key,
    ol.message_type AS notification_type,
    ol.status,
    ol.recipient_address,
    ol.notification_language,
    ol.template_variables,
    ol.failure_reason,
    ol.related_entity_type,
    ol.related_entity_id,
    ol.original_log_id,
    ol.pk_template_id,
    ol.pk_sending_operation_id
FROM notifications.outbound_log ol
WHERE ol.id = :id::UUID;
