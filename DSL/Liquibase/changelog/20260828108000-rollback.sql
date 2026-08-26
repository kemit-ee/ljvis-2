-- liquibase formatted sql
-- changeset ljvis:20260828108000-rollback ignore:true

DELETE FROM users.permission WHERE code IN (
    'sp_driver_form.write', 'sp_driver_form.read',
    'sp_teammate_form.write', 'sp_teammate_form.read'
);
