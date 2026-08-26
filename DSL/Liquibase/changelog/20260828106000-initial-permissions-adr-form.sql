-- liquibase formatted sql
-- changeset ljvis:20260828106000 splitStatements:false

INSERT INTO users.permission (code, description, created_by) VALUES
    ('adr_form.write', 'ADR (ohtlik veos) kontrollvormi loomine, täitmine, salvestamine ja kinnitamine', 'ljvis2'),
    ('adr_form.read',  'ADR (ohtlik veos) kontrollvormi andmete lugemine', 'ljvis2')
ON CONFLICT (code) DO NOTHING;
