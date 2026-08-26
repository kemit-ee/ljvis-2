-- liquibase formatted sql
-- changeset ljvis:20260828110000-rollback ignore:true

DELETE FROM users.permission WHERE code IN (
    'ctud.read', 'ctud.create', 'ctud.send',
    'cgr.read', 'cgr.create', 'cgr.send',
    'rsi.read', 'rsi.create', 'rsi.send',
    'ncr.read', 'ncr.create', 'ncr.respond', 'ncr.send', 'ncr.list',
    'risk_report.list'
);
