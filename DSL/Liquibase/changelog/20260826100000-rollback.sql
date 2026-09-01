-- liquibase formatted sql
-- changeset ljvis:20260826100000 ignore:true

ALTER TABLE xroad.xroad_integration_log
    DROP COLUMN IF EXISTS person_identifier,
    DROP COLUMN IF EXISTS source_type,
    DROP COLUMN IF EXISTS source_record_id;