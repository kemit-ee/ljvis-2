-- liquibase formatted sql
-- changeset ljvis:20260828107000-rollback ignore:true

DELETE FROM users.permission WHERE code IN ('good_repute_form.write', 'good_repute_form.read');
