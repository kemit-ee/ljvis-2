-- liquibase formatted sql
-- changeset ljvis:20261015100001 ignore:true splitStatements:false
--
-- Puuduvad prod-õigused: auditilogi ja välisrikkumise vorm olid seni prodis
-- ligipääsmatud — .guard failid viitasid õigustele, mida õiguste kataloogis ei
-- olnud (need elasid ainult test-seemnes DSL/Liquibase/test/20260519100001).
--
--   audit.read           — auditilogi kõigi asutuste ulatuses            → Super Admin Group
--   audit.read.local     — auditilogi ainult oma asutuse ulatuses        → Super Admin + Local Admin Group
--   audit.verify         — räsiahela terviklikkuse kontroll (globaalne)  → Super Admin Group
--   foreign_violation_form.read  / .write                                → Super Admin (read+write), Officer (read), Local Admin (read)
--   compound_form.read   — koondvormi üldosa lugemine (senine surnud OR-haru guardides) → Super Admin Group
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
        ('audit.read',                   'Auditilogi kõigi asutuste kirjete vaatamine, filtreerimine, sorteerimine ja CSV-eksport', 'ljvis2'),
        ('audit.read.local',             'Auditilogi vaatamine ja CSV-eksport ainult oma asutuse kirjete ulatuses', 'ljvis2'),
        ('audit.verify',                 'Auditilogi räsiahela terviklikkuse kontroll', 'ljvis2'),
        ('foreign_violation_form.read',  'Välisriigi rikkumise andmevormi andmete lugemine ja failide allalaadimine', 'ljvis2'),
        ('foreign_violation_form.write', 'Välisriigi rikkumise andmevormi loomine, täitmine, salvestamine ja failide üleslaadimine', 'ljvis2'),
        ('compound_form.read',           'Kontrollivormi üldosa andmete lugemine', 'ljvis2')
    ON CONFLICT (code) DO NOTHING;

    FOR g IN
        SELECT DISTINCT ON (user_group_key) user_group_key, name, organisations, permissions
        FROM users.user_group
        WHERE name IN ('Super Admin Group', 'Local Admin Group', 'Officer Group')
        ORDER BY user_group_key, created_at DESC
    LOOP
        add_perms := CASE g.name
            WHEN 'Super Admin Group' THEN ARRAY['audit.read', 'audit.verify', 'audit.read.local',
                                                'foreign_violation_form.read', 'foreign_violation_form.write',
                                                'compound_form.read']
            WHEN 'Local Admin Group' THEN ARRAY['audit.read.local', 'foreign_violation_form.read']
            WHEN 'Officer Group'     THEN ARRAY['foreign_violation_form.read']
        END;

        add_perms := ARRAY(SELECT p FROM unnest(add_perms) AS p WHERE NOT (p = ANY(g.permissions)));

        IF COALESCE(array_length(add_perms, 1), 0) > 0 THEN
            INSERT INTO users.user_group (user_group_key, name, organisations, permissions, created_by)
            VALUES (g.user_group_key, g.name, g.organisations, g.permissions || add_perms, 'ljvis2');
        END IF;
    END LOOP;
END $$;
