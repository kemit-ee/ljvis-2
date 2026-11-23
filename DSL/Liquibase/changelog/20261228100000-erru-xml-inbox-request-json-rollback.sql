-- liquibase formatted sql
-- changeset ljvis:20261228100000-rollback ignore:true

DROP INDEX IF EXISTS erru.idx_xml_inbox_async_due;
ALTER TABLE erru.xml_inbox DROP COLUMN IF EXISTS request_json;
