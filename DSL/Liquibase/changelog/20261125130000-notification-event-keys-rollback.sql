-- rollback for 20261125130000-notification-event-keys.sql

DELETE FROM notifications.notification_template_mapping
WHERE created_by = 'ljvis2'
  AND notification_type IN (
      'ncr_ok', 'rsi_received', 'serious_infringement',
      'extraordinary_inspection', 'cargo_securing'
  );

DROP INDEX IF EXISTS notifications.uq_notification_type_event;
DROP INDEX IF EXISTS notifications.uq_notification_legacy_entity_type;

ALTER TABLE notifications.notification
    DROP COLUMN IF EXISTS event_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_entity_type
    ON notifications.notification(type, related_entity_type, related_entity_id)
    WHERE related_entity_id IS NOT NULL;
