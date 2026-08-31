-- liquibase formatted sql
-- changeset ljvis:20260828101000-rollback ignore:true

DELETE FROM users.permission WHERE code IN (
    'classifier.list', 'classifier.read', 'classifier.edit', 'classifier_value.edit'
);
