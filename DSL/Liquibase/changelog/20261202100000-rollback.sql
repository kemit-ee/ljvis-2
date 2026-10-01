-- liquibase formatted sql
-- changeset ljvis:20261202100000-rollback ignore:true

DELETE FROM users.permission WHERE code = 'form.export';
