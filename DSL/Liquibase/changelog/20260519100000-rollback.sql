-- liquibase formatted sql
-- changeset ljvis:20260519100000 ignore:true

DROP TABLE IF EXISTS ljvis2.user_account CASCADE;
DROP TABLE IF EXISTS ljvis2.user_group CASCADE;
DROP TABLE IF EXISTS ljvis2.permission CASCADE;
DROP TABLE IF EXISTS ljvis2.organisation CASCADE;
DROP SEQUENCE IF EXISTS ljvis2.seq_user_account_key;
DROP SEQUENCE IF EXISTS ljvis2.seq_user_group_key;
DROP SCHEMA IF EXISTS ljvis2 CASCADE;
