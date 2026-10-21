-- liquibase formatted sql
-- changeset ljvis:20260925143000 ignore:true splitStatements:false

INSERT INTO users.permission (code, description, created_by) VALUES
    ('control_form.punishment_register', 'Karistusregistri kasutaja: menetluse tulemuse sisestamine ja kontrollvormi käsitsi avalikustamine', 'ljvis2')
ON CONFLICT (code) DO NOTHING;
