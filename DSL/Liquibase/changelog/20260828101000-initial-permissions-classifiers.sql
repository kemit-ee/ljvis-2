-- liquibase formatted sql
-- changeset ljvis:20260828101000 splitStatements:false

INSERT INTO users.permission (code, description, created_by) VALUES
    ('classifier.list',       'Klassifikaatorite nimekirja detailvaate vaatamine', 'ljvis2'),
    ('classifier.read',       'Klassifikaatori detailvaate vaatamine', 'ljvis2'),
    ('classifier.edit',       'Klassifikaatori nimetuse ja selgituse muutmine', 'ljvis2'),
    ('classifier_value.edit', 'Klassifikaatorile uue väärtuse loomine ja väärtuse kehtivusperioodi muutmine', 'ljvis2')
ON CONFLICT (code) DO NOTHING;
