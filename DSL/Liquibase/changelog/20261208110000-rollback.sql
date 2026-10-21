-- liquibase formatted sql
-- changeset ljvis:20261208110000-rollback ignore:true

DROP TABLE IF EXISTS notifications.outbound_log_status_event;

DROP INDEX IF EXISTS notifications.uq_carrier_notification_request_revision;
ALTER TABLE notifications.carrier_notification_request DROP COLUMN IF EXISTS revision;
CREATE UNIQUE INDEX IF NOT EXISTS uq_carrier_notification_request_open
    ON notifications.carrier_notification_request (entity_type, entity_id)
    WHERE sent_at IS NULL;
