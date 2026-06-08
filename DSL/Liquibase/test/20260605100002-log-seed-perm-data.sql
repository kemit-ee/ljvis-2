-- liquibase formatted sql
-- changeset ljvis:20260605100002 ignore:true
-- Seed data

INSERT INTO ljvis2.permission (code, description, created_by) VALUES ('audit.read', 'Auditilogi kirjete vaatamine, filtreerimine, sorteerimine ja eksportimine CSV-failina', 'ljvis2');