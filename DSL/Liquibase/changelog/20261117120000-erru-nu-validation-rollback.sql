-- liquibase formatted sql
-- changeset ljvis:20261117120000-rollback ignore:true splitStatements:false
ALTER TABLE erru.nu_message
  DROP CONSTRAINT IF EXISTS chk_nu_complete_blocks,
  DROP CONSTRAINT IF EXISTS chk_nu_required_fields;
DROP FUNCTION IF EXISTS erru.nu_validate(JSONB, TEXT);
ALTER TABLE erru.nu_message
  ALTER COLUMN tm_first_name_search_key TYPE VARCHAR(20),
  ALTER COLUMN tm_family_name_search_key TYPE VARCHAR(20);
