-- liquibase formatted sql
-- changeset ljvis:20261120100000 ignore:true
-- Rollback: 20261120100000-audit-event-actor-user-account-id (kutsutakse ainult .xml <rollback> kaudu).

DROP INDEX IF EXISTS audit.idx_ae_actor_user_account_id;
ALTER TABLE audit.audit_event DROP COLUMN IF EXISTS actor_user_account_id;
