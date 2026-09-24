/*
description: Teavituse liigi -> Postkast 2.0 malli kataloogi kehtiv rida (12-1 §4 "Teavituse liigid ja mallid").
  send-postkast.yml kasutab seda selgitamaks kas liik saadetakse Postkast 2.0 kaudu (channel='postkast',
  active=true), mis malli algset tunnust ja mis vaikimisi vastuvõtja aadressi kasutada.
  Append-only tabel — kehtiv rida on värskeim (created_at DESC, id DESC tiebreak samas
  transaktsioonis lisatud ridade jaoks, vt 20261121140000-notification-template-mapping-append-only.sql).
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
- name: defaultRecipientEmail
  type: string
  nullable: true
- name: desktopRecipientPersonalCodes
  type: array
  nullable: true
*/
SELECT
    notification_type,
    original_template_id,
    channel,
    default_language,
    active,
    default_recipient_email,
    desktop_recipient_personal_codes
FROM notifications.notification_template_mapping
WHERE notification_type = :notification_type
ORDER BY created_at DESC, id DESC
LIMIT 1;
