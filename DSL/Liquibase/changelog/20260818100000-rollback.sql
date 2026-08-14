-- liquibase formatted sql
-- changeset ljvis:20260818100000 ignore:true

ALTER TABLE erru.ncr_message
    DROP CONSTRAINT IF EXISTS chk_ncr_response_community_licence_status,
    DROP COLUMN IF EXISTS responding_authority,
    DROP COLUMN IF EXISTS response_number_of_vehicles,
    DROP COLUMN IF EXISTS response_community_licence_status,
    DROP COLUMN IF EXISTS response_address;
