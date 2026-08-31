-- liquibase formatted sql
-- changeset ljvis:20260829121000-rollback ignore:true

DELETE FROM users.permission WHERE code IN (
    'tram_driver_form.write', 'tram_driver_form.read'
);
