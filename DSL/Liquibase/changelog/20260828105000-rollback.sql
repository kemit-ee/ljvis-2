-- liquibase formatted sql
-- changeset ljvis:20260828105000-rollback ignore:true

DELETE FROM users.permission WHERE code IN (
    'transport_interruption_form.write', 'transport_interruption_form.read'
);
