-- liquibase formatted sql
-- changeset ljvis:20261010100000 ignore:true splitStatements:false
-- Rollback: 20261010100000-notifications-schema (kutsutakse ainult .xml <rollback> kaudu)

DROP TABLE IF EXISTS notifications.outbound_log_recipient;
DROP TABLE IF EXISTS notifications.outbound_log;
DROP TABLE IF EXISTS notifications.notification_read;
DROP TABLE IF EXISTS notifications.notification;
DROP SCHEMA  IF EXISTS notifications;
