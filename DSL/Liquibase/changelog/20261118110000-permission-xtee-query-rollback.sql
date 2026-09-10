-- liquibase formatted sql
-- changeset ljvis:20261118110000-rollback ignore:true

DELETE FROM users.permission WHERE code = 'xtee.query';
