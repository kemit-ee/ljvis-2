-- liquibase formatted sql
-- changeset ljvis:20261121150000 ignore:true splitStatements:false
--
-- Uued õigused notification-template-mapping haldusvaate jaoks (vt
-- 20261121140000-notification-template-mapping-append-only.sql). Samas
-- mustris mis 20260828101000-initial-permissions-classifiers.sql — lisatakse
-- ainult kataloogi, gruppidele omistamine käib halduse grupihalduse vaate
-- kaudu.

INSERT INTO users.permission (code, description, created_by) VALUES
    ('notification_template_mapping.list', 'Postkast 2.0 malli tunnuse ja vaikimisi vastuvõtja seadistuste vaatamine', 'ljvis2'),
    ('notification_template_mapping.edit', 'Postkast 2.0 malli tunnuse ja vaikimisi vastuvõtja seadistuste muutmine', 'ljvis2')
ON CONFLICT (code) DO NOTHING;
