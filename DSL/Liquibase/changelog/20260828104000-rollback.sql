-- liquibase formatted sql
-- changeset ljvis:20260828104000-rollback ignore:true

DELETE FROM users.permission WHERE code IN (
    'vehicle_technical_form.write', 'vehicle_technical_form.read',
    'trailer_technical_form.write', 'trailer_technical_form.read'
);
