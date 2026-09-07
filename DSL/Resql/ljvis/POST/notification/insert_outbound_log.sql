/*
declaration:
  version: 0.2
  description: >-
    Loob Postkast 2.0 saatmiskatse logi kirje (UC-01, UC-04).
    APPEND-ONLY: iga saatmiskatse (sh uuesti saatmine) loob uue rea, oma
    notification_key'ga. Uuesti saatmisel täidetakse original_log_id väli.
    Tagastab loodud kirje id.
    status algab tavaliselt 'queued'-ist (send-postkast.yml insert_outbound_log
    samm) ja 'error'-iga kui adressaat on kehtetu juba enne X-tee kutset.
    pk_sending_operation_id/staatuse edasine muutmine käib
    update_outbound_log_status.sql kaudu (send-postkast.yml callPk vastus,
    cron/notification-status-sync.yml).
  method: post
  accepts: json
  returns: json
  namespace: notification
  allowlist:
    body:
      - field: notification_key
        type: string
      - field: message_type
        type: string
      - field: status
        type: string
      - field: recipient_address
        type: string
      - field: notification_language
        type: string
      - field: template_variables
        type: json
      - field: failure_reason
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
      - field: payload_json
        type: json
      - field: created_by
        type: string
*/
INSERT INTO notifications.outbound_log (
    notification_key,
    message_type,
    status,
    recipient_address,
    notification_language,
    template_variables,
    failure_reason,
    related_entity_type,
    related_entity_id,
    original_log_id,
    pk_template_id,
    pk_sending_operation_id,
    payload_json,
    created_by
)
VALUES (
    NULLIF(:notification_key, ''),
    :message_type,
    :status,
    NULLIF(:recipient_address, ''),
    COALESCE(NULLIF(:notification_language, ''), 'et'),
    :template_variables::JSONB,
    NULLIF(:failure_reason, ''),
    :related_entity_type,
    :related_entity_id,
    NULLIF(:original_log_id, '')::UUID,
    NULLIF(:pk_template_id, ''),
    NULLIF(:pk_sending_operation_id, ''),
    :payload_json::JSONB,
    COALESCE(NULLIF(:created_by, ''), 'system')
)
RETURNING id, notification_key;
