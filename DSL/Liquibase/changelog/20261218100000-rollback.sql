-- liquibase formatted sql
-- changeset ljvis:20261218100000-rollback ignore:true

DELETE FROM users.permission WHERE code = 'control_form.view_unit';
