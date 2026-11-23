-- liquibase formatted sql
-- changeset ljvis:20261229100000-rollback ignore:true splitStatements:false

ALTER TABLE notifications.outbound_log
    DROP COLUMN IF EXISTS found_recipient_address;
