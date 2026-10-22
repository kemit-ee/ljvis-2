-- liquibase formatted sql
-- changeset ljvis:20261225100000-rollback ignore:true splitStatements:false
DELETE FROM notifications.notification_template_mapping
WHERE notification_type = 'ctud_inbound_received' AND channel = 'desktop';
