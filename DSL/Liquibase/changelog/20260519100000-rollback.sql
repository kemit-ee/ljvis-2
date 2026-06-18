-- liquibase formatted sql
-- changeset ljvis:20260519100000 ignore:true

DROP TABLE IF EXISTS users.user_account CASCADE;
DROP TABLE IF EXISTS users.user_group CASCADE;
DROP TABLE IF EXISTS users.permission CASCADE;
DROP TABLE IF EXISTS users.organisation CASCADE;
DROP SEQUENCE IF EXISTS users.seq_user_account_key;
DROP SEQUENCE IF EXISTS users.seq_user_group_key;
DROP SCHEMA IF EXISTS users CASCADE;
