-- liquibase formatted sql
-- changeset ljvis:20260828104000 splitStatements:false

INSERT INTO users.permission (code, description, created_by) VALUES
    ('vehicle_technical_form.write', 'Mootorsõiduki tehnonõuetele vastavuse kontrollvormi loomine, täitmine, salvestamine ja kinnitamine', 'ljvis2'),
    ('vehicle_technical_form.read',  'Mootorsõiduki tehnonõuetele vastavuse kontrollvormi andmete lugemine', 'ljvis2'),
    ('trailer_technical_form.write', 'Haagise tehnonõuetele vastavuse kontrollvormi loomine, täitmine, salvestamine ja kinnitamine', 'ljvis2'),
    ('trailer_technical_form.read',  'Haagise tehnonõuetele vastavuse kontrollvormi andmete lugemine', 'ljvis2')
ON CONFLICT (code) DO NOTHING;
