-- liquibase formatted sql
-- changeset ljvis:20260330100001 ignore:true

DELETE FROM ljvis2.user_group_latest;
DELETE FROM ljvis2.user_account_latest;
DELETE FROM ljvis2.user_group_permission_state;
DELETE FROM ljvis2.user_group_permission;
DELETE FROM ljvis2.user_group_organisation_state;
DELETE FROM ljvis2.user_group_organisation;
DELETE FROM ljvis2.user_account_user_group_state;
DELETE FROM ljvis2.user_account_user_group;
DELETE FROM ljvis2.permission;
DELETE FROM ljvis2.user_group_name_state;
DELETE FROM ljvis2.user_group;
DELETE FROM ljvis2.user_account_state;
DELETE FROM ljvis2.user_account_data_state;
DELETE FROM ljvis2.user_account;
DELETE FROM ljvis2.organisation;

ALTER SEQUENCE ljvis2.user_group_latest_id_seq RESTART WITH 1;
ALTER SEQUENCE ljvis2.user_account_latest_id_seq RESTART WITH 1;
ALTER SEQUENCE ljvis2.user_group_permission_state_id_seq RESTART WITH 1;
ALTER SEQUENCE ljvis2.user_group_permission_id_seq RESTART WITH 1;
ALTER SEQUENCE ljvis2.user_group_organisation_state_id_seq RESTART WITH 1;
ALTER SEQUENCE ljvis2.user_group_organisation_id_seq RESTART WITH 1;
ALTER SEQUENCE ljvis2.user_account_user_group_state_id_seq RESTART WITH 1;
ALTER SEQUENCE ljvis2.user_account_user_group_id_seq RESTART WITH 1;
ALTER SEQUENCE ljvis2.permission_id_seq RESTART WITH 1;
ALTER SEQUENCE ljvis2.user_group_name_state_id_seq RESTART WITH 1;
ALTER SEQUENCE ljvis2.user_group_id_seq RESTART WITH 1;
ALTER SEQUENCE ljvis2.user_account_state_id_seq RESTART WITH 1;
ALTER SEQUENCE ljvis2.user_account_data_state_id_seq RESTART WITH 1;
ALTER SEQUENCE ljvis2.user_account_id_seq RESTART WITH 1;
ALTER SEQUENCE ljvis2.organisation_id_seq RESTART WITH 1;
