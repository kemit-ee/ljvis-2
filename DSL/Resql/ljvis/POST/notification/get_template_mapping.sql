/*
declaration:
  version: 0.1
  description: >-
    Teavituse liigi -> Postkast 2.0 malli kataloogi rida (12-1 §4 "Teavituse
    liigid ja mallid"). send-postkast.yml kasutab seda selgitamaks kas liik
    saadetakse Postkast 2.0 kaudu (channel='postkast', active=true) ja mis
    malli algset tunnust kasutada.
  method: post
  accepts: json
  returns: json
  namespace: notification
  allowlist:
    body:
      - field: notification_type
        type: string
  response:
    fields:
      - field: notificationType
        type: string
      - field: originalTemplateId
        type: string
      - field: channel
        type: string
      - field: defaultLanguage
        type: string
      - field: active
        type: boolean
*/
SELECT
    notification_type,
    original_template_id,
    channel,
    default_language,
    active
FROM notifications.notification_template_mapping
WHERE notification_type = :notification_type;
