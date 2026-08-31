/*
declaration:
  version: 0.1
  description: >-
    Loob Postkast 2.0 saatmiskatse logi kirje (UC-01, UC-04).
    APPEND-ONLY: iga saatmiskatse (sh uuesti saatmine) loob uue rea.
    Uuesti saatmisel täidetakse original_log_id väli.
    Tagastab loodud kirje id.
    pk_sending_operation_id salvestatakse pärast PK 2.0 API vastust
    eraldi UPDATE-iga (NB: see on ainus koht kus UPDATE on lubatud
    kuna sending_operation_id saabub API vastusena INSERT-i järel).
  method: post
  accepts: json
  returns: json
  namespace: notification
  allowlist:
    body:
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
      - field: payload_json
        type: json
      - field: created_by
        type: string
*/
INSERT INTO notifications.outbound_log (
    message_type,
    status,
    related_entity_type,
    related_entity_id,
    original_log_id,
    pk_template_id,
    pk_sending_operation_id,
    payload_json,
    created_by
)
VALUES (
    :message_type,
    :status,
    :related_entity_type,
    :related_entity_id,
    NULLIF(:original_log_id, '')::UUID,
    NULLIF(:pk_template_id, ''),
    NULLIF(:pk_sending_operation_id, ''),
    :payload_json::JSONB,
    COALESCE(NULLIF(:created_by, ''), 'system')
)
RETURNING id;
