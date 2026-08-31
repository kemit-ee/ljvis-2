-- liquibase formatted sql
-- changeset ljvis:20261010100001 splitStatements:false
--
-- LJVIS2-XXX: teavituste mooduli notification.admin õigus.
-- UC-02 saadetud kirjade logi vaatamine ja UC-04 uuesti saatmine.
--
-- Lisatakse users.permission kataloogi JA Super Admin Group-ile
-- append-only viisil (users.user_group on lisamisega-salvestamise mudel,
-- sama muster nagu test/20260827100000-risk-score-permission-seed.sql,
-- kuid siin changelog-is ilma ignore:true-ta et jooksta kõigis keskkondades).

DO $$
BEGIN
    -- 1. Lisa permission kataloogi (idempotentne)
    INSERT INTO users.permission (code, description, created_by) VALUES
        ('notification.admin',
         'Postkast 2.0 kaudu saadetud väliste teavituste logi vaatamine ja ebaõnnestunud teavituste uuesti saatmine (UC-02/UC-04)',
         'ljvis2')
    ON CONFLICT (code) DO NOTHING;

    -- 2. Lisa Super Admin Group-ile append-only
    -- DISTINCT ON latest state + lisa õigus ainult kui puudub.
    INSERT INTO users.user_group (user_group_key, name, organisations, permissions, created_by)
    SELECT
        user_group_key,
        name,
        organisations,
        permissions || ARRAY['notification.admin']::TEXT[],
        'ljvis2'
    FROM (
        SELECT DISTINCT ON (user_group_key)
            user_group_key, name, organisations, permissions
        FROM users.user_group
        WHERE name = 'Super Admin Group'
        ORDER BY user_group_key, created_at DESC
    ) latest
    WHERE NOT ('notification.admin' = ANY(permissions));
END $$;
