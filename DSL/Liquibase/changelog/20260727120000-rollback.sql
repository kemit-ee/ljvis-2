-- liquibase formatted sql
-- changeset ljvis:20260727120000-rollback ignore:true

DROP TABLE IF EXISTS xroad.xroad_integration_log CASCADE;
DROP SCHEMA IF EXISTS xroad CASCADE;
