-- liquibase formatted sql
-- changeset ljvis:20260519100000 ignore:true

DROP TABLE IF EXISTS ljvis2.user_group_latest CASCADE;
DROP TABLE IF EXISTS ljvis2.user_account_latest CASCADE;
DROP TABLE IF EXISTS ljvis2.user_group_permission_state CASCADE;
DROP TABLE IF EXISTS ljvis2.user_group_permission CASCADE;
DROP TABLE IF EXISTS ljvis2.user_group_organisation_state CASCADE;
DROP TABLE IF EXISTS ljvis2.user_group_organisation CASCADE;
DROP TABLE IF EXISTS ljvis2.user_account_user_group_state CASCADE;
DROP TABLE IF EXISTS ljvis2.user_account_user_group CASCADE;
DROP TABLE IF EXISTS ljvis2.permission CASCADE;
DROP TABLE IF EXISTS ljvis2.user_group_name_state CASCADE;
DROP TABLE IF EXISTS ljvis2.user_group CASCADE;
DROP TABLE IF EXISTS ljvis2.user_account_state CASCADE;
DROP TABLE IF EXISTS ljvis2.user_account_data_state CASCADE;
DROP TABLE IF EXISTS ljvis2.user_account CASCADE;
DROP TABLE IF EXISTS ljvis2.organisation CASCADE;
DROP SCHEMA IF EXISTS ljvis2 CASCADE;
