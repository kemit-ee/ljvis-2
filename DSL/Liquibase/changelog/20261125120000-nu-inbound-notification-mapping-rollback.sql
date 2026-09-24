-- liquibase formatted sql
-- changeset ljvis:20261125120000-rollback ignore:true splitStatements:false
-- Rollback: 20261125120000-nu-inbound-notification-mapping (kutsutakse ainult .xml <rollback> kaudu).

DELETE FROM notifications.notification_template_mapping
    WHERE notification_type = 'nu_inbound_received' AND created_by = 'ljvis2';
