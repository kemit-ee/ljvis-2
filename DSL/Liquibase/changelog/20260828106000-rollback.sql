-- liquibase formatted sql
-- changeset ljvis:20260828106000-rollback ignore:true

DELETE FROM users.permission WHERE code IN ('adr_form.write', 'adr_form.read');
