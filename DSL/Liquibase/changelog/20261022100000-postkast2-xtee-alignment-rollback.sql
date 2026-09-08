-- liquibase formatted sql
-- changeset ljvis:20261022100000-rollback ignore:true splitStatements:false
-- Rollback: 20261022100000-postkast2-xtee-alignment (kutsutakse ainult .xml <rollback> kaudu).

DROP TABLE IF EXISTS notifications.notification_template_mapping;

ALTER TABLE notifications.outbound_log
    DROP CONSTRAINT IF EXISTS chk_outbound_log_status;

DROP INDEX IF EXISTS notifications.idx_outbound_log_recipient_address;
DROP INDEX IF EXISTS notifications.uq_outbound_log_notification_key;

ALTER TABLE notifications.outbound_log
    DROP COLUMN IF EXISTS status_check_count,
    DROP COLUMN IF EXISTS pk_completed_at,
    DROP COLUMN IF EXISTS pk_operation_restart_allowed,
    DROP COLUMN IF EXISTS requested_send_time,
    DROP COLUMN IF EXISTS template_variables,
    DROP COLUMN IF EXISTS failure_reason,
    DROP COLUMN IF EXISTS notification_language,
    DROP COLUMN IF EXISTS recipient_address,
    DROP COLUMN IF EXISTS notification_key;
