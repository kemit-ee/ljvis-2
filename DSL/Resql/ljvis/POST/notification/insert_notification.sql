/*
description: 'Loob uue in-app teavituse notifications.notification tabelisse. Idempotentne: ON CONFLICT
  DO NOTHING indeksi uq_notification_entity_type kaudu — sama tüüp + seotud kirje loob ainult ühe teavituse.
  Tagastab loodud kirje id (või null kui kirje juba eksisteeris). APPEND-ONLY: INSERT only, UPDATE puudub.'
namespace: notification
params:
  type:
    type: string
    required: false
  required_permission:
    type: string
    required: false
  related_entity_type:
    type: string
    required: false
  related_entity_id:
    type: string
    required: false
  title_et:
    type: string
    required: false
  body_et:
    type: string
    required: false
  recipient_personal_codes:
    type: string
    required: false
    description: Comma-separated personal_code list (desktop-kanali konkreetsed saajad, tardistatud loomise hetkel)
  created_by:
    type: string
    required: false
*/
INSERT INTO notifications.notification (
    type,
    required_permission,
    related_entity_type,
    related_entity_id,
    title_et,
    body_et,
    recipient_personal_codes,
    created_by
)
VALUES (
    :type,
    :required_permission,
    :related_entity_type,
    :related_entity_id,
    :title_et,
    :body_et,
    CASE WHEN COALESCE(:recipient_personal_codes, '') = '' THEN NULL
         ELSE string_to_array(:recipient_personal_codes, ',') END,
    COALESCE(NULLIF(:created_by, ''), 'system')
)
ON CONFLICT (type, related_entity_type, related_entity_id)
    WHERE related_entity_id IS NOT NULL
    DO NOTHING
RETURNING id;
