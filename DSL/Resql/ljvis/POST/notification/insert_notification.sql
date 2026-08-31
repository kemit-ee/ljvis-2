/*
declaration:
  version: 0.1
  description: >-
    Loob uue in-app teavituse notifications.notification tabelisse.
    Idempotentne: ON CONFLICT DO NOTHING indeksi uq_notification_entity_type
    kaudu — sama tüüp + seotud kirje loob ainult ühe teavituse.
    Tagastab loodud kirje id (või null kui kirje juba eksisteeris).
    APPEND-ONLY: INSERT only, UPDATE puudub.
  method: post
  accepts: json
  returns: json
  namespace: notification
  allowlist:
    body:
      - field: type
        type: string
      - field: required_permission
        type: string
      - field: related_entity_type
        type: string
      - field: related_entity_id
        type: string
      - field: title_et
        type: string
      - field: body_et
        type: string
      - field: created_by
        type: string
*/
INSERT INTO notifications.notification (
    type,
    required_permission,
    related_entity_type,
    related_entity_id,
    title_et,
    body_et,
    created_by
)
VALUES (
    :type,
    :required_permission,
    :related_entity_type,
    :related_entity_id,
    :title_et,
    :body_et,
    COALESCE(NULLIF(:created_by, ''), 'system')
)
ON CONFLICT (type, related_entity_type, related_entity_id)
    WHERE related_entity_id IS NOT NULL
    DO NOTHING
RETURNING id;
