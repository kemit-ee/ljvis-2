-- liquibase formatted sql
-- changeset ljvis:20261022100001 ignore:true splitStatements:false
--
-- LJVIS2-43: analüüs 12-2 "Saadetud teavituste nimekirja vaatamine" jagab
-- 20261010100001-notification-permission.sql loodud notification.admin kaheks
-- eraldi õiguseks:
--   notification.list   — teavituste logi vaatamine (sh vea põhjus)
--   notification.resend — ebaõnnestunud teavituse käsitsi uuesti saatmine
--
-- Sama append-only muster mis 20261010100001. notification.admin eemaldatakse
-- kataloogist ja gruppide massiividest — toodangus seda gruppi veel kasutusel
-- pole (moodul pole toodangus), seega puhas asendus ei jäta lahtiseid otsi.

DO $$
BEGIN
    -- 1. Lisa uued õigused kataloogi (idempotentne)
    INSERT INTO users.permission (code, description, created_by) VALUES
        ('notification.list',
         'Postkast 2.0 kaudu saadetud väliste teavituste logi vaatamine, sh ebaõnnestunud katse vea põhjus (UC-02)',
         'ljvis2'),
        ('notification.resend',
         'Ebaõnnestunud Postkast 2.0 teavituse käsitsi uuesti saatmine teavituste logist (UC-04)',
         'ljvis2')
    ON CONFLICT (code) DO NOTHING;

    -- 2. Iga grupp, kellel on notification.admin: lisa mõlemad uued õigused,
    --    eemalda notification.admin (append-only — uus rida latest peale).
    INSERT INTO users.user_group (user_group_key, name, organisations, permissions, created_by)
    SELECT
        user_group_key,
        name,
        organisations,
        (SELECT ARRAY_AGG(DISTINCT p) FROM unnest(
            array_remove(permissions, 'notification.admin')
            || ARRAY['notification.list', 'notification.resend']::TEXT[]
        ) AS p),
        'ljvis2'
    FROM (
        SELECT DISTINCT ON (user_group_key)
            user_group_key, name, organisations, permissions
        FROM users.user_group
        ORDER BY user_group_key, created_at DESC
    ) latest
    WHERE 'notification.admin' = ANY(permissions);

    -- 3. Eemalda notification.admin kataloogist — pärast sammu 2 pole ühelgi
    --    grupil seda enam massiivis (uusim rida). Guardid ei kontrolli seda
    --    enam kunagi, seega dangling string vanas ajaloolises reas on kahjutu.
    DELETE FROM users.permission WHERE code = 'notification.admin';
END $$;
