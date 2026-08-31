-- liquibase formatted sql
-- changeset ljvis:20260828103000-rollback ignore:true

DELETE FROM users.permission WHERE code IN (
    'compound_form.write', 'control_form.view_unpublished',
    'control_form.delete', 'control_form.edit_locked'
);
