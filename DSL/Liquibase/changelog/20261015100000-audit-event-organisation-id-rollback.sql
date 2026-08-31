-- liquibase formatted sql
-- changeset ljvis:20261015100000 ignore:true
-- Rollback: 20261015100000-audit-event-organisation-id (kutsutakse ainult .xml <rollback> kaudu).

DROP INDEX IF EXISTS audit.idx_ae_organisation_id;
ALTER TABLE audit.audit_event DROP COLUMN IF EXISTS organisation_id;
