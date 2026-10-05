-- liquibase formatted sql
-- changeset ljvis:20261207100000-rollback ignore:true

DELETE FROM users.permission WHERE code = 'control_form.view_organisation';
