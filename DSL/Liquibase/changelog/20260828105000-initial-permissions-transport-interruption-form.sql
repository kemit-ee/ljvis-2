-- liquibase formatted sql
-- changeset ljvis:20260828105000 splitStatements:false

INSERT INTO users.permission (code, description, created_by) VALUES
    ('transport_interruption_form.write', 'Autoveo katkestamise kontrollvormi loomine, täitmine, salvestamine ja kinnitamine', 'ljvis2'),
    ('transport_interruption_form.read',  'Autoveo katkestamise kontrollvormi andmete lugemine', 'ljvis2')
ON CONFLICT (code) DO NOTHING;
