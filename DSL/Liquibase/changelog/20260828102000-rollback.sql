-- liquibase formatted sql
-- changeset ljvis:20260828102000-rollback ignore:true

DELETE FROM users.permission WHERE code IN (
    'labour_inspection_form.write', 'labour_inspection_form.read'
);
