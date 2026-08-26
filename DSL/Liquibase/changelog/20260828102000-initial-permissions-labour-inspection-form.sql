-- liquibase formatted sql
-- changeset ljvis:20260828102000 splitStatements:false

INSERT INTO users.permission (code, description, created_by) VALUES
    ('labour_inspection_form.write', 'Tööinspektsiooni kontrollakti loomine, täitmine, salvestamine ja kinnitamine', 'ljvis2'),
    ('labour_inspection_form.read',  'Tööinspektsiooni kontrollakti andmete lugemine', 'ljvis2')
ON CONFLICT (code) DO NOTHING;
