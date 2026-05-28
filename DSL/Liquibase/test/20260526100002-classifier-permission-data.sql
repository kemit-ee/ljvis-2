-- liquibase formatted sql
-- changeset ljvis:20260526100002 ignore:true
-- Seed data

INSERT INTO ljvis2.permission (code, description, created_by) VALUES ('classifier.list', 'Klassifikaatorite nimekirja detailvaate vaatamine', 'ljvis2');
INSERT INTO ljvis2.permission (code, description, created_by) VALUES ('classifier.read', 'Klassifikaatori detailvaate vaatamine', 'ljvis2');
INSERT INTO ljvis2.permission (code, description, created_by) VALUES ('classifier.edit', 'Klassifikaatori nimetuse ja selgituse muutmine', 'ljvis2');
INSERT INTO ljvis2.permission (code, description, created_by) VALUES ('classifier_value.edit', 'Klassifikaatorile uue väärtuse loomine ja väärtuse kehtivusperioodi muutmine', 'ljvis2');