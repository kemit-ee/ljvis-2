-- Käsitsi käivitatav täiendus CI/dev andmebaasile.
-- Jooksuta PÄRAST seed_test_data.sql-i.
-- Idempotentne: korduvalt ohutult käivitatav.
--
-- Käivitamine (dev):
--   psql -h localhost -p 54321 -U ljvis -d ljvis_db -f tests/bootstrap/seed_extra.sql

BEGIN;

-- ============================================================
-- Asutused
-- ============================================================
INSERT INTO users.organisation (name, code, created_by)
SELECT 'Kliimaministeerium', 'KLIM', 'bootstrap-extra'
WHERE NOT EXISTS (SELECT 1 FROM users.organisation WHERE code = 'KLIM');

INSERT INTO users.organisation (name, code, created_by)
SELECT 'Tööinspektsioon', 'TI', 'bootstrap-extra'
WHERE NOT EXISTS (SELECT 1 FROM users.organisation WHERE code = 'TI');

INSERT INTO users.organisation (name, code, created_by)
SELECT 'Eesti Rahvusvaheliste Autovedajate Assotsiatsioon', 'ERAA', 'bootstrap-extra'
WHERE NOT EXISTS (SELECT 1 FROM users.organisation WHERE code = 'ERAA');

-- ============================================================
-- Puuduvad permissions kataloogis
-- ============================================================
INSERT INTO users.permission (code, description, created_by) VALUES
    ('audit.read',                  'Auditilogi kirjete vaatamine, filtreerimine, sorteerimine ja eksportimine', 'bootstrap-extra'),
    ('audit.verify',                'Auditilogi kirjete terviklikkuse kontrollimine', 'bootstrap-extra'),
    ('compound_form.read',          'Koondvormi andmete lugemine', 'bootstrap-extra'),
    ('foreign_violation_form.write','Välisriigi rikkumise andmevormi loomine, täitmine, salvestamine ja failide üleslaadimine', 'bootstrap-extra'),
    ('foreign_violation_form.read', 'Välisriigi rikkumise andmevormi andmete lugemine ja failide allalaadimine', 'bootstrap-extra'),
    ('sp_driver_form.write',        'Autojuhi sõidu- ja puhkeaja alamvormi täitmine ja salvestamine', 'bootstrap-extra'),
    ('sp_driver_form.read',         'Autojuhi sõidu- ja puhkeaja alamvormi andmete lugemine', 'bootstrap-extra'),
    ('sp_teammate_form.write',      'Meeskonnaliikme sõidu- ja puhkeaja alamvormi täitmine ja salvestamine', 'bootstrap-extra'),
    ('sp_teammate_form.read',       'Meeskonnaliikme sõidu- ja puhkeaja alamvormi andmete lugemine', 'bootstrap-extra')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- Super Admin grupi uus snapshot — täielik permissions massiiv
-- (INSERT-only muster: uuim rida sama user_group_key-ga = kehtiv)
-- Lisab kõik puuduvad õigused + uued asutused organisatsioonide hulka.
-- ============================================================
INSERT INTO users.user_group (user_group_key, name, organisations, permissions, created_by)
SELECT
    ug.user_group_key,
    'Super Admin Group',
    (SELECT COALESCE(ARRAY_AGG(id ORDER BY name), ARRAY[]::BIGINT[])
     FROM users.organisation),
    ARRAY[
        'user_group.list.admin','user_group.read.admin','user_group.read.local',
        'user_group.create','user_group.update',
        'user_group.list_users.admin','user_group.search_eligible_users',
        'user_group.add_user','user_group.remove_user',
        'user.list.admin','user.read.admin','user.edit.admin',
        'organisation.list','permission.list',
        'classifier.list','classifier.read','classifier.edit','classifier_value.edit',
        'audit.read','audit.verify',
        'labour_inspection_form.write','labour_inspection_form.read',
        'compound_form.write','compound_form.read',
        'vehicle_technical_form.write','vehicle_technical_form.read',
        'trailer_technical_form.write','trailer_technical_form.read',
        'transport_interruption_form.write','transport_interruption_form.read',
        'adr_form.write','adr_form.read',
        'good_repute_form.write','good_repute_form.read',
        'foreign_violation_form.write','foreign_violation_form.read',
        'sp_driver_form.write','sp_driver_form.read',
        'sp_teammate_form.write','sp_teammate_form.read',
        'control_form.view_unpublished','control_form.delete','control_form.edit_locked',
        'xtee.query.rahvastikuregister'
    ]::TEXT[],
    'bootstrap-extra'
FROM (
    SELECT DISTINCT ON (user_group_key)
        user_group_key
    FROM users.user_group
    WHERE name = 'Super Admin Group'
    ORDER BY user_group_key, created_at DESC
) ug;

-- ============================================================
-- Kasutaja Maris Albrecht
-- ============================================================
INSERT INTO users.user_account (
    user_account_key, personal_code, first_name, last_name,
    organisation_id, organisation_name, structural_unit, job_title,
    email, phone, access_start, status, user_groups, created_by
)
SELECT
    nextval('users.seq_user_account_key'),
    '47008094914', 'Maris', 'Albrecht',
    o.id, o.name, '', 'IT teenuse omanik',
    'maris.albrecht@kemit.ee', '', '2026-01-01', 'active',
    (SELECT ARRAY[ug.user_group_key]
     FROM users.user_group ug
     WHERE ug.name = 'Super Admin Group'
     ORDER BY ug.created_at DESC LIMIT 1),
    'bootstrap-extra'
FROM users.organisation o
WHERE o.code = 'KLIM'
  AND NOT EXISTS (SELECT 1 FROM users.user_account WHERE personal_code = '47008094914');

COMMIT;
