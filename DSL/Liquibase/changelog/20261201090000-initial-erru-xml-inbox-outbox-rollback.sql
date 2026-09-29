-- liquibase formatted sql
-- changeset ljvis:20261201090000-rollback ignore:true splitStatements:false
DROP TRIGGER IF EXISTS trg_notify_xml_outbox ON erru.xml_outbox;
DROP TRIGGER IF EXISTS trg_notify_xml_inbox ON erru.xml_inbox;
DROP FUNCTION IF EXISTS erru.notify_xml_outbox();
DROP FUNCTION IF EXISTS erru.notify_xml_inbox();
DROP TABLE IF EXISTS erru.xml_outbox;
DROP TABLE IF EXISTS erru.xml_inbox;
