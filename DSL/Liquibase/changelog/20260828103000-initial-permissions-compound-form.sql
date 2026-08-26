-- liquibase formatted sql
-- changeset ljvis:20260828103000 splitStatements:false

INSERT INTO users.permission (code, description, created_by) VALUES
    ('compound_form.write',          'Koondvormi loomine, täitmine, salvestamine ja kinnitamine', 'ljvis2'),
    ('control_form.view_unpublished','Avaldamata (salvestatud/kinnitatud) koondvormide vaatamine muu isiku poolt, kui vormi looja/kinnitaja', 'ljvis2'),
    ('control_form.delete',          'Koondvormi kustutamine koos kõigi alamvormidega', 'ljvis2'),
    ('control_form.edit_locked',     'Kinnitatud vormi X-tee andmevahetuskihi plokkide muutmine (administraator)', 'ljvis2')
ON CONFLICT (code) DO NOTHING;
