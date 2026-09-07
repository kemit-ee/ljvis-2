/*
description: Teavituse liigi -> Postkast 2.0 malli kataloogi rida (12-1 §4 "Teavituse liigid ja mallid").
  send-postkast.yml kasutab seda selgitamaks kas liik saadetakse Postkast 2.0 kaudu (channel='postkast',
  active=true) ja mis malli algset tunnust kasutada.
namespace: notification
params:
  notification_type:
    type: string
    required: false
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
*/
SELECT
    notification_type,
    original_template_id,
    channel,
    default_language,
    active
FROM notifications.notification_template_mapping
WHERE notification_type = :notification_type;
