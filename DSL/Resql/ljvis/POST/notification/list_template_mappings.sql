/*
description: Kõik teavituse liigid ja nende kehtiv Postkast 2.0 malli/vastuvõtja seadistus —
  halduse loendivaate jaoks (notification-template-mapping/list.yml).
  Append-only tabel — kehtiv rida iga notification_type kohta on värskeim
  (created_at DESC, id DESC tiebreak, vt get_template_mapping.sql).
namespace: notification
params: {}
returns:
- name: notificationType
  type: string
  nullable: true
- name: originalTemplateId
  type: string
  nullable: true
- name: channel
  type: string
  nullable: true
- name: defaultLanguage
  type: string
  nullable: true
- name: active
  type: boolean
  nullable: true
- name: defaultRecipientEmail
  type: string
  nullable: true
- name: createdAt
  type: string
  nullable: true
- name: createdBy
  type: string
  nullable: true
*/
SELECT DISTINCT ON (notification_type)
    notification_type,
    original_template_id,
    channel,
    default_language,
    active,
    default_recipient_email,
    created_at,
    created_by
FROM notifications.notification_template_mapping
ORDER BY notification_type, created_at DESC, id DESC;
