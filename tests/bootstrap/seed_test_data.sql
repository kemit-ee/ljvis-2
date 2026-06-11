-- Bootstrap seed for CI functional tests (v2 schema).
-- Runs via psql AFTER Liquibase has applied schema ONLY.
-- All writes are single snapshot INSERTs — no junction tables, no _state tables, no rebuild steps.
-- NOT a Liquibase migration — plain SQL, idempotent.

BEGIN;

-- ============================================================
-- Organisations  (flat catalogue — unchanged from v1)
-- ============================================================
INSERT INTO ljvis2.organisation (name, code, created_by)
SELECT 'CI Bootstrap Organisation', 'CBO', 'bootstrap'
WHERE NOT EXISTS (SELECT 1 FROM ljvis2.organisation WHERE code = 'CBO');

INSERT INTO ljvis2.organisation (name, code, created_by)
SELECT 'Justiitsministeerium', 'JUM', 'bootstrap'
WHERE NOT EXISTS (SELECT 1 FROM ljvis2.organisation WHERE code = 'JUM');

INSERT INTO ljvis2.organisation (name, code, created_by)
SELECT 'Politsei- ja Piirivalveamet', 'PPA', 'bootstrap'
WHERE NOT EXISTS (SELECT 1 FROM ljvis2.organisation WHERE code = 'PPA');

-- ============================================================
-- Permissions  (flat catalogue — unchanged from v1)
-- ============================================================
INSERT INTO ljvis2.permission (code, description, created_by) VALUES
    ('user_group.list.admin',            'Kasutajagruppide nimekirja vaatamine kõigi asutuste ulatuses', 'bootstrap'),
    ('user_group.list.local',            'Kasutajagruppide nimekirja vaatamine ainult oma asutusega seotud gruppidele', 'bootstrap'),
    ('user_group.read.admin',            'Kasutajagrupi detailvaate algandmete vaatamine kõigi gruppide ulatuses', 'bootstrap'),
    ('user_group.read.local',            'Kasutajagrupi detailvaate algandmete vaatamine ainult oma asutusega seotud gruppidele', 'bootstrap'),
    ('user_group.create',                'Uue kasutajagrupi loomine', 'bootstrap'),
    ('user_group.update',                'Kasutajagrupi nimetuse, asutuste ja õiguste-seoste muutmine', 'bootstrap'),
    ('user_group.list_users.admin',      'Kasutajagrupi liikmete pagineeritud nimekiri kõigi asutuste ulatuses', 'bootstrap'),
    ('user_group.list_users.local',      'Kasutajagrupi liikmete pagineeritud nimekiri ainult oma asutuse kasutajatele', 'bootstrap'),
    ('user_group.search_eligible_users', 'Gruppi sidumiseks sobivate kasutajate otsimine', 'bootstrap'),
    ('user_group.add_user',              'Kasutaja(te) sidumine kasutajagrupiga', 'bootstrap'),
    ('user_group.remove_user',           'Kasutaja eemaldamine kasutajagrupist', 'bootstrap'),
    ('user.list.admin',                  'Kasutajate nimekirja vaatamine kõigi asutuste ulatuses', 'bootstrap'),
    ('user.list.local',                  'Kasutajate nimekirja vaatamine ainult oma asutuse kasutajatele', 'bootstrap'),
    ('user.read.admin',                  'Kasutaja andmete vaatamine kõigi asutuste ulatuses', 'bootstrap'),
    ('user.read.local',                  'Kasutaja andmete vaatamine ainult oma asutuse kasutajatele', 'bootstrap'),
    ('user.edit.admin',                  'Kasutaja lisamine, vaatamine ja muutmine kõigi asutuste ulatuses', 'bootstrap'),
    ('user.edit.local',                  'Kasutaja lisamine, vaatamine ja muutmine ainult oma asutuse kasutajatele', 'bootstrap'),
    ('organisation.list',                'Asutuste kataloogi laadimine UI valikute jaoks', 'bootstrap'),
    ('permission.list',                  'Õiguste kataloogi laadimine UI valikute jaoks', 'bootstrap'),
    ('classifier.list',                  'Klassifikaatorite nimekirja detailvaate vaatamine', 'bootstrap'),
    ('classifier.read',                  'Klassifikaatori detailvaate vaatamine', 'bootstrap'),
    ('classifier.edit',                  'Klassifikaatori nimetuse ja selgituse muutmine', 'bootstrap'),
    ('classifier_value.edit',            'Klassifikaatorile uue väärtuse loomine ja väärtuse kehtivusperioodi muutmine', 'bootstrap')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- User groups  (v2: single snapshot INSERT per group)
-- ============================================================
INSERT INTO ljvis2.user_group (user_group_key, name, organisations, permissions, created_by)
SELECT
    nextval('ljvis2.seq_user_group_key'),
    'Super Admin Group',
    (SELECT COALESCE(ARRAY_AGG(id ORDER BY name), ARRAY[]::BIGINT[])
     FROM ljvis2.organisation),
    ARRAY['user_group.list.admin','user_group.read.admin','user_group.read.local','user_group.create','user_group.update','user_group.list_users.admin','user_group.search_eligible_users','user_group.add_user','user_group.remove_user','user.list.admin','user.read.admin','user.edit.admin','organisation.list','permission.list','classifier.list','classifier.read','classifier.edit','classifier_value.edit']::TEXT[],
    'bootstrap'
WHERE NOT EXISTS (SELECT 1 FROM ljvis2.user_group WHERE name = 'Super Admin Group');

INSERT INTO ljvis2.user_group (user_group_key, name, organisations, permissions, created_by)
SELECT
    nextval('ljvis2.seq_user_group_key'),
    'Local Admin Group',
    (SELECT COALESCE(ARRAY_AGG(id ORDER BY name), ARRAY[]::BIGINT[])
     FROM ljvis2.organisation WHERE code = 'JUM'),
    ARRAY['user_group.list.local','user_group.read.local','user_group.create','user_group.update','user_group.list_users.local','user_group.search_eligible_users','user_group.add_user','user_group.remove_user','user.list.local','user.read.local','user.edit.local','organisation.list','permission.list','classifier.list','classifier.read','classifier.edit','classifier_value.edit']::TEXT[],
    'bootstrap'
WHERE NOT EXISTS (SELECT 1 FROM ljvis2.user_group WHERE name = 'Local Admin Group');

-- ============================================================
-- Users  (v2: single snapshot INSERT per user)
-- Personal codes match docker/tara-mock/identities.json
-- ============================================================
INSERT INTO ljvis2.user_account (
    user_account_key, personal_code, first_name, last_name,
    organisation_id, organisation_name, structural_unit, job_title,
    email, phone, access_start, status, user_groups, created_by
)
SELECT
    nextval('ljvis2.seq_user_account_key'),
    '38001085718', 'Super', 'Admin',
    o.id, o.name, 'LÕUNA PREFEKTUUR', 'Spetsialist',
    'super.admin@ljvis.test', '55500001', '2024-01-01', 'active',
    (SELECT ARRAY[ug.user_group_key]
     FROM ljvis2.user_group ug WHERE ug.name = 'Super Admin Group'
     ORDER BY ug.created_at DESC LIMIT 1),
    'bootstrap'
FROM ljvis2.organisation o
WHERE o.code = 'PPA'
  AND NOT EXISTS (SELECT 1 FROM ljvis2.user_account WHERE personal_code = '38001085718');

-- ============================================================
-- Classifiers  (v2: single snapshot INSERT per classifier)
-- ============================================================
INSERT INTO ljvis2.classifier (classifier_key, code, name, created_by)
SELECT nextval('ljvis2.seq_classifier_key'), 'RTK', 'Riikide ja territooriumide klassifikaator', 'bootstrap'
WHERE NOT EXISTS (SELECT 1 FROM ljvis2.classifier WHERE code = 'RTK');

INSERT INTO ljvis2.classifier (classifier_key, code, name, created_by)
SELECT nextval('ljvis2.seq_classifier_key'), 'TEST', 'Test Classifier', 'bootstrap'
WHERE NOT EXISTS (SELECT 1 FROM ljvis2.classifier WHERE code = 'TEST');

COMMIT;
