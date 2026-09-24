-- liquibase formatted sql
-- changeset ljvis:20261201085000-rollback ignore:true splitStatements:false
DROP FUNCTION IF EXISTS erru.record_inbound_audit(TEXT, BIGINT, TEXT, JSONB);
DROP TABLE IF EXISTS erru.inbound_audit_key;
DROP INDEX IF EXISTS erru.uq_rsi_inbound_answered_technical_id;
