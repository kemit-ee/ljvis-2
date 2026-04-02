-- liquibase formatted sql
-- changeset ljvis:20260330100000 ignore:true

DROP TABLE IF EXISTS users.user_user_group CASCADE;
DROP TABLE IF EXISTS users.user_group_permission CASCADE;
DROP TABLE IF EXISTS users.user_group_organisation CASCADE;
DROP TABLE IF EXISTS users.user_group CASCADE;
DROP TABLE IF EXISTS users."user" CASCADE;
DROP TABLE IF EXISTS users.permission CASCADE;
DROP TABLE IF EXISTS users.organisation CASCADE;
DROP SCHEMA IF EXISTS users CASCADE;
