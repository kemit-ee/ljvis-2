-- liquibase formatted sql
-- changeset ljvis:20261015100001 ignore:true splitStatements:false
-- Rollback: 20261015100001-audit-foreign-violation-permissions (kutsutakse ainult .xml <rollback> kaudu).
-- NB: append-only user_group snapshot-ridu ei kustutata — kuna permission kirjed
-- kustutatakse, ei mõjuta jäänud grant'id runtime kontrolli.

DELETE FROM users.permission WHERE code IN (
    'audit.read', 'audit.read.local', 'audit.verify',
    'foreign_violation_form.read', 'foreign_violation_form.write', 'compound_form.read'
);
