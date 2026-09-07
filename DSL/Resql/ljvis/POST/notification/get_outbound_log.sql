/*
description: Single Postkast 2.0 outbound_log row by id. Used by UC-04 resend (resend.yml) to load the
  original send attempt it is retrying — reads recipient_address + template_variables + notification_type
  unchanged.
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
