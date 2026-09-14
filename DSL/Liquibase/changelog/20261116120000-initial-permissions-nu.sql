-- liquibase formatted sql
-- changeset ljvis:20261116120000 ignore:true splitStatements:false

INSERT INTO users.permission (code, description, created_by) VALUES
    ('nu.list',   'ERRU sobimatusteadete (NU) loendi vaatamine ja filtreerimine', 'ljvis2'),
    ('nu.read',   'ERRU sobimatusteate (NU) ja selle koondkinnituse vaatamine', 'ljvis2'),
    ('nu.create', 'ERRU sobimatusteate (NU) väljamineva mustandi koostamine ja salvestamine', 'ljvis2'),
    ('nu.send',   'ERRU sobimatusteate (NU) saatmine ERRU-sse', 'ljvis2')
ON CONFLICT (code) DO NOTHING;
