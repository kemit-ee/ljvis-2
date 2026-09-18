-- liquibase formatted sql
-- changeset ljvis:20260918100001 splitStatements:false
--
-- Uus õigus Haldus > eToimiku X-tee logid lehe jaoks:
--
--   xroad.log.read — eToimiku X-tee integratsioonilogi (xroad.xroad_integration_log)
--                    vaatamine, sh väljuva päringu ja saabunud vastuse sisu → Super Admin Group
--
-- Ainult Super Admin Group, mitte Local Admin — logi sisaldab isikuandmeid
-- (isikukood, nimi, sünniaeg) üle asutuste piiride, samamoodi kui audit.read
-- (mitte audit.read.local) on piiratud Super Adminiga.
--
-- Grupi-grantid append-only users.user_group snapshot-mudelis: lisatakse uus
-- snapshot-rida sama user_group_key alla ainult kui grupp on olemas ja õigust
-- veel ei ole. Idempotentne.

DO $$
DECLARE
    g          RECORD;
    add_perms  TEXT[];
BEGIN
    INSERT INTO users.permission (code, description, created_by) VALUES
        ('xroad.log.read', 'eToimiku X-tee integratsioonilogi vaatamine (Haldus)', 'ljvis2')
    ON CONFLICT (code) DO NOTHING;

    FOR g IN
        SELECT DISTINCT ON (user_group_key) user_group_key, name, organisations, permissions
        FROM users.user_group
        WHERE name = 'Super Admin Group'
        ORDER BY user_group_key, created_at DESC
    LOOP
        add_perms := ARRAY['xroad.log.read'];
        add_perms := ARRAY(SELECT p FROM unnest(add_perms) AS p WHERE NOT (p = ANY(g.permissions)));

        IF COALESCE(array_length(add_perms, 1), 0) > 0 THEN
            INSERT INTO users.user_group (user_group_key, name, organisations, permissions, created_by)
            VALUES (g.user_group_key, g.name, g.organisations, g.permissions || add_perms, 'ljvis2');
        END IF;
    END LOOP;
END $$;
