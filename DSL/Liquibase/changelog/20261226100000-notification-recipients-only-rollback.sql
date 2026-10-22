-- liquibase formatted sql
-- changeset ljvis:20261226100000-rollback ignore:true splitStatements:false
ALTER TABLE notifications.notification DROP COLUMN IF EXISTS recipients_only;
