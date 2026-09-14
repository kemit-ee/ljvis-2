-- liquibase formatted sql
-- changeset ljvis:20261116120000-rollback ignore:true
DELETE FROM users.permission WHERE code IN ('nu.list', 'nu.read', 'nu.create', 'nu.send');
