-- liquibase formatted sql
-- changeset ljvis:20261216100000-rollback ignore:true

DELETE FROM users.organisation WHERE code = 'REPM';
