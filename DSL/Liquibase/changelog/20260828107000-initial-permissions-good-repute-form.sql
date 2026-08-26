-- liquibase formatted sql
-- changeset ljvis:20260828107000 splitStatements:false

INSERT INTO users.permission (code, description, created_by) VALUES
    ('good_repute_form.write', 'Hea maine vormi loomine, täitmine, salvestamine ja failide üleslaadimine', 'ljvis2'),
    ('good_repute_form.read',  'Hea maine vormi andmete lugemine ja failide allalaadimine', 'ljvis2')
ON CONFLICT (code) DO NOTHING;
