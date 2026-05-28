-- liquibase formatted sql
-- changeset ljvis:20260527153101-rollback ignore:true
-- EPIC 02 guarded rollback
-- Removes indexes before dropping tables so dependencies unwind in a predictable order.
-- All drops are guarded to keep rollback safe when objects are already missing.
DROP INDEX IF EXISTS idx_ugl_organisations_gin;
DROP INDEX IF EXISTS idx_ugl_name_lower;
DROP INDEX IF EXISTS idx_ugl_user_group_id_created_at;
DROP INDEX IF EXISTS idx_ual_user_groups_gin;
DROP INDEX IF EXISTS idx_ual_status;
DROP INDEX IF EXISTS idx_ual_organisation_id;
DROP INDEX IF EXISTS idx_ual_last_name_lower;
DROP INDEX IF EXISTS idx_ual_first_name_lower;
DROP INDEX IF EXISTS idx_ual_user_account_id_created_at;
DROP INDEX IF EXISTS idx_ugp_state_created_at;
DROP INDEX IF EXISTS idx_ugp_state_ugp_id;
DROP INDEX IF EXISTS idx_ugp_permission_id;
DROP INDEX IF EXISTS idx_ugp_user_group_id;
DROP INDEX IF EXISTS idx_ugo_state_created_at;
DROP INDEX IF EXISTS idx_ugo_state_ugo_id;
DROP INDEX IF EXISTS idx_ugo_organisation_id;
DROP INDEX IF EXISTS idx_ugo_user_group_id;
DROP INDEX IF EXISTS idx_uaug_state_uaug_id_created_at;
DROP INDEX IF EXISTS idx_uaug_state_created_at;
DROP INDEX IF EXISTS idx_uaug_state_uaug_id;
DROP INDEX IF EXISTS idx_uaug_user_group_id;
DROP INDEX IF EXISTS idx_uaug_user_account_id;
DROP INDEX IF EXISTS idx_permission_code;
DROP INDEX IF EXISTS idx_ugns_name_lower;
DROP INDEX IF EXISTS idx_ugns_user_group_id_created_at;
DROP INDEX IF EXISTS idx_user_account_state_ua_id_created_at;
DROP INDEX IF EXISTS idx_user_account_state_created_at;
DROP INDEX IF EXISTS idx_user_account_state_ua_id;
DROP INDEX IF EXISTS idx_uads_access_end;
DROP INDEX IF EXISTS idx_uads_last_name;
DROP INDEX IF EXISTS idx_uads_first_name;
DROP INDEX IF EXISTS idx_uads_organisation_id;
DROP INDEX IF EXISTS idx_uads_user_account_id_created_at;
DROP INDEX IF EXISTS idx_user_account_personal_code;
DROP INDEX IF EXISTS idx_organisation_name;
DROP INDEX IF EXISTS uq_permission_code;
DROP INDEX IF EXISTS uq_user_account_personal_code;
DROP INDEX IF EXISTS uq_organisation_code;

DROP TABLE IF EXISTS user_group_latest CASCADE;
DROP TABLE IF EXISTS user_account_latest CASCADE;
DROP TABLE IF EXISTS user_group_permission_state CASCADE;
DROP TABLE IF EXISTS user_group_permission CASCADE;
DROP TABLE IF EXISTS user_group_organisation_state CASCADE;
DROP TABLE IF EXISTS user_group_organisation CASCADE;
DROP TABLE IF EXISTS user_account_user_group_state CASCADE;
DROP TABLE IF EXISTS user_account_user_group CASCADE;
DROP TABLE IF EXISTS user_group_name_state CASCADE;
DROP TABLE IF EXISTS user_account_state CASCADE;
DROP TABLE IF EXISTS user_account_data_state CASCADE;
DROP TABLE IF EXISTS permission CASCADE;
DROP TABLE IF EXISTS user_group CASCADE;
DROP TABLE IF EXISTS user_account CASCADE;
DROP TABLE IF EXISTS organisation CASCADE;
