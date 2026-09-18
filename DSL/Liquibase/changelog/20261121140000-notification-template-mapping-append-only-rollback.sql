-- liquibase formatted sql
-- changeset ljvis:20261121140000-rollback ignore:true splitStatements:false
-- Rollback: 20261121140000-notification-template-mapping-append-only (kutsutakse ainult .xml <rollback> kaudu).

DELETE FROM notifications.notification_template_mapping
    WHERE created_by = 'ljvis2'
    AND notification_type IN ('carrier_violation', 'labor_kabotage', 'labor_foreign_proposal');

DROP INDEX IF EXISTS notifications.idx_ntm_key_ts;

ALTER TABLE notifications.notification_template_mapping
    DROP CONSTRAINT IF EXISTS pk_notification_template_mapping,
    DROP COLUMN IF EXISTS default_recipient_email,
    DROP COLUMN IF EXISTS created_by,
    DROP COLUMN IF EXISTS created_at,
    DROP COLUMN IF EXISTS id;

ALTER TABLE notifications.notification_template_mapping
    ADD CONSTRAINT notification_template_mapping_pkey PRIMARY KEY (notification_type);
