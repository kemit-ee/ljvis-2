-- liquibase formatted sql
-- changeset ljvis:20260605100000 ignore:true

DROP TRIGGER  IF EXISTS audit_event_chain  ON audit.audit_event;
DROP FUNCTION IF EXISTS audit.chain();
DROP TABLE    IF EXISTS audit.chain_tip    CASCADE;
DROP TABLE    IF EXISTS audit.audit_event  CASCADE;
ALTER DATABASE ljvis_db RESET app.audit_salt;
