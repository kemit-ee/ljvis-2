/*
description: Single Postkast 2.0 outbound_log row by id. Used by UC-04 resend (resend.yml) and check-status/send.yml
  to load the original send attempt it is retrying — reads recipient_address + template_variables + notification_type
  unchanged. Praegune seis = viimane outbound_log_status_event rida (INSERT-only), ilma eventita outbound_log rida
  ise.
namespace: notification
params:
  id:
    type: string
    required: false
    description: outbound_log id
returns:
- name: id
  type: string
  nullable: true
- name: notificationKey
  type: string
  nullable: true
- name: notificationType
  type: string
  nullable: true
- name: status
  type: string
  nullable: true
- name: recipientAddress
  type: string
  nullable: true
- name: notificationLanguage
  type: string
  nullable: true
- name: templateVariables
  type: object
  nullable: true
- name: failureReason
  type: string
  nullable: true
- name: relatedEntityType
  type: string
  nullable: true
- name: relatedEntityId
  type: string
  nullable: true
- name: originalLogId
  type: string
  nullable: true
- name: pkTemplateId
  type: string
  nullable: true
- name: pkSendingOperationId
  type: string
  nullable: true
*/
WITH cur AS (
  SELECT
    ol.id, ol.notification_key, ol.message_type, ol.recipient_address, ol.notification_language, ol.template_variables,
    ol.related_entity_type, ol.related_entity_id, ol.original_log_id, ol.pk_template_id,
    ol.status, ol.failure_reason, ol.pk_sending_operation_id, ol.pk_operation_restart_allowed, ol.pk_completed_at, ol.status_check_count,
    (SELECT e FROM notifications.outbound_log_status_event e WHERE e.log_id = ol.id ORDER BY e.revision DESC LIMIT 1) AS ev
  FROM notifications.outbound_log ol
  WHERE ol.id = :id::UUID
)
SELECT
    c.id,
    c.notification_key,
    c.message_type AS notification_type,
    CASE WHEN (c.ev).id IS NULL THEN c.status ELSE (c.ev).status END AS status,
    c.recipient_address,
    c.notification_language,
    c.template_variables,
    CASE WHEN (c.ev).id IS NULL THEN c.failure_reason ELSE (c.ev).failure_reason END AS failure_reason,
    c.related_entity_type,
    c.related_entity_id,
    c.original_log_id,
    c.pk_template_id,
    CASE WHEN (c.ev).id IS NULL THEN c.pk_sending_operation_id ELSE (c.ev).pk_sending_operation_id END AS pk_sending_operation_id
FROM cur c;
