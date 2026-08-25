-- liquibase formatted sql
-- changeset ljvis:20260828108000 splitStatements:false

INSERT INTO users.permission (code, description, created_by) VALUES
    ('sp_driver_form.write',   'Autojuhi sõidu- ja puhkeaja alamvormi täitmine ja salvestamine', 'ljvis2'),
    ('sp_driver_form.read',    'Autojuhi sõidu- ja puhkeaja alamvormi andmete lugemine', 'ljvis2'),
    ('sp_teammate_form.write', 'Kaasautojuhi sõidu- ja puhkeaja alamvormi täitmine ja salvestamine', 'ljvis2'),
    ('sp_teammate_form.read',  'Kaasautojuhi sõidu- ja puhkeaja alamvormi andmete lugemine', 'ljvis2')
ON CONFLICT (code) DO NOTHING;
