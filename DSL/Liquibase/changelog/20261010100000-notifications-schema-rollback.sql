-- Rollback: 20261010100000-notifications-schema
-- liquibase formatted sql
-- changeset ljvis:20261010100000-rollback splitStatements:false

DROP TABLE IF EXISTS notifications.outbound_log_recipient;
DROP TABLE IF EXISTS notifications.outbound_log;
DROP TABLE IF EXISTS notifications.notification_read;
DROP TABLE IF EXISTS notifications.notification;
DROP SCHEMA  IF EXISTS notifications;
