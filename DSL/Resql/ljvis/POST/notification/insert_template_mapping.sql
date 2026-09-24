/*
description: Lisa uus versioon ühele notification_template_mapping võtmele (append-only —
  rida ei uuendata, halduse salvestus lisab alati uue rea samale notification_type'ile;
  vt notification-template-mapping/save.yml).
namespace: notification
params:
  notification_type:
    type: string
    required: false
  original_template_id:
    type: string
    required: false
  channel:
    type: string
    required: false
  default_language:
    type: string
    required: false
  active:
    type: boolean
    required: false
  default_recipient_email:
    type: string
    required: false
  desktop_recipient_personal_codes:
    type: string
    required: false
    description: Comma-separated personal_code list (desktop-kanali konkreetsed saajad)
  created_by:
    type: string
    required: false
returns:
- name: id
  type: number
  nullable: true
- name: notificationType
  type: string
  nullable: true
*/
INSERT INTO notifications.notification_template_mapping (
    notification_type, original_template_id, channel, default_language,
    active, default_recipient_email, desktop_recipient_personal_codes, created_by
)
VALUES (
    :notification_type,
    CASE WHEN COALESCE(:original_template_id, '') = '' THEN NULL ELSE :original_template_id END,
    :channel,
    :default_language,
    :active::BOOLEAN,
    CASE WHEN COALESCE(:default_recipient_email, '') = '' THEN NULL ELSE :default_recipient_email END,
    CASE WHEN COALESCE(:desktop_recipient_personal_codes, '') = '' THEN NULL
         ELSE string_to_array(:desktop_recipient_personal_codes, ',') END,
    :created_by
)
RETURNING id, notification_type AS "notificationType";
