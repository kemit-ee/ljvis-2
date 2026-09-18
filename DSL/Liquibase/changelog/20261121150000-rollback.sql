-- liquibase formatted sql
-- changeset ljvis:20261121150000-rollback ignore:true

DELETE FROM users.permission WHERE code IN (
    'notification_template_mapping.list', 'notification_template_mapping.edit'
);
