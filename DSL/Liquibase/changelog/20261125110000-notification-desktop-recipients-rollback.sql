-- liquibase formatted sql
-- changeset ljvis:20261125110000-rollback ignore:true splitStatements:false
-- Rollback: 20261125110000-notification-desktop-recipients (kutsutakse ainult .xml <rollback> kaudu).

DROP INDEX IF EXISTS notifications.idx_notification_recipient_codes;

ALTER TABLE notifications.notification
    DROP COLUMN IF EXISTS recipient_personal_codes;

ALTER TABLE notifications.notification_template_mapping
    DROP COLUMN IF EXISTS desktop_recipient_personal_codes;
