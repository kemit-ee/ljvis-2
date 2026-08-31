-- liquibase formatted sql
-- changeset ljvis:20260829121000 splitStatements:false

INSERT INTO users.permission (code, description, created_by) VALUES
    ('tram_driver_form.write', 'Transpordiameti kontrollkaardi (autojuhi SP-vorm) täitmine ja salvestamine', 'ljvis2'),
    ('tram_driver_form.read',  'Transpordiameti kontrollkaardi (autojuhi SP-vorm) andmete lugemine', 'ljvis2')
ON CONFLICT (code) DO NOTHING;
