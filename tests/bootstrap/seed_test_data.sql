-- Bootstrap seed for CI functional tests (v2 schema).
-- Runs via psql AFTER Liquibase has applied schema ONLY.
-- All writes are single snapshot INSERTs — no junction tables, no _state tables, no rebuild steps.
-- NOT a Liquibase migration — plain SQL, idempotent.

BEGIN;

-- ============================================================
-- Organisations  (flat catalogue — unchanged from v1)
-- ============================================================
INSERT INTO users.organisation (name, code, created_by)
SELECT 'CI Bootstrap Organisation', 'CBO', 'bootstrap'
WHERE NOT EXISTS (SELECT 1 FROM users.organisation WHERE code = 'CBO');

INSERT INTO users.organisation (name, code, created_by)
SELECT 'Justiitsministeerium', 'JUM', 'bootstrap'
WHERE NOT EXISTS (SELECT 1 FROM users.organisation WHERE code = 'JUM');

INSERT INTO users.organisation (name, code, created_by)
SELECT 'Politsei- ja Piirivalveamet', 'PPA', 'bootstrap'
WHERE NOT EXISTS (SELECT 1 FROM users.organisation WHERE code = 'PPA');

-- ============================================================
-- Permissions  (flat catalogue — unchanged from v1)
-- ============================================================
INSERT INTO users.permission (code, description, created_by) VALUES
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
    ('classifier_value.edit',            'Klassifikaatorile uue väärtuse loomine ja väärtuse kehtivusperioodi muutmine', 'bootstrap'),
    ('labour_inspection_form.write',     'Tööinspektsiooni kontrollakti loomine, täitmine, salvestamine ja kinnitamine', 'bootstrap'),
    ('labour_inspection_form.read',      'Tööinspektsiooni kontrollakti andmete lugemine', 'bootstrap'),
    ('control_form.view_unpublished',    'Avaldamata (salvestatud/kinnitatud) koondvormide vaatamine muu isiku poolt, kui vormi looja/kinnitaja', 'bootstrap'),
    ('control_form.delete',              'Koondvormi kustutamine koos kõigi alamvormidega', 'bootstrap')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- User groups  (v2: single snapshot INSERT per group)
-- ============================================================
INSERT INTO users.user_group (user_group_key, name, organisations, permissions, created_by)
SELECT
    nextval('users.seq_user_group_key'),
    'Super Admin Group',
    (SELECT COALESCE(ARRAY_AGG(id ORDER BY name), ARRAY[]::BIGINT[])
     FROM users.organisation),
    ARRAY['user_group.list.admin','user_group.read.admin','user_group.read.local','user_group.create','user_group.update','user_group.list_users.admin','user_group.search_eligible_users','user_group.add_user','user_group.remove_user','user.list.admin','user.read.admin','user.edit.admin','organisation.list','permission.list','classifier.list','classifier.read','classifier.edit','classifier_value.edit','labour_inspection_form.write','labour_inspection_form.read','control_form.view_unpublished','control_form.delete']::TEXT[],
    'bootstrap'
WHERE NOT EXISTS (SELECT 1 FROM users.user_group WHERE name = 'Super Admin Group');

INSERT INTO users.user_group (user_group_key, name, organisations, permissions, created_by)
SELECT
    nextval('users.seq_user_group_key'),
    'Local Admin Group',
    (SELECT COALESCE(ARRAY_AGG(id ORDER BY name), ARRAY[]::BIGINT[])
     FROM users.organisation WHERE code = 'JUM'),
    ARRAY['user_group.list.local','user_group.read.local','user_group.create','user_group.update','user_group.list_users.local','user_group.search_eligible_users','user_group.add_user','user_group.remove_user','user.list.local','user.read.local','user.edit.local','organisation.list','permission.list','classifier.list','classifier.read','classifier.edit','classifier_value.edit']::TEXT[],
    'bootstrap'
WHERE NOT EXISTS (SELECT 1 FROM users.user_group WHERE name = 'Local Admin Group');

-- ============================================================
-- Users  (v2: single snapshot INSERT per user)
-- Personal codes match docker/tara-mock/identities.json
-- ============================================================
INSERT INTO users.user_account (
    user_account_key, personal_code, first_name, last_name,
    organisation_id, organisation_name, structural_unit, job_title,
    email, phone, access_start, status, user_groups, created_by
)
SELECT
    nextval('users.seq_user_account_key'),
    '60001019906', 'Super', 'Admin',
    o.id, o.name, 'LÕUNA PREFEKTUUR', 'Spetsialist',
    'super.admin@ljvis.test', '55500001', '2024-01-01', 'active',
    (SELECT ARRAY[ug.user_group_key]
     FROM users.user_group ug WHERE ug.name = 'Super Admin Group'
     ORDER BY ug.created_at DESC LIMIT 1),
    'bootstrap'
FROM users.organisation o
WHERE o.code = 'PPA'
  AND NOT EXISTS (SELECT 1 FROM users.user_account WHERE personal_code = '60001019906');

-- ============================================================
-- Classifiers  (v2: single snapshot INSERT per classifier)
-- ============================================================
INSERT INTO classifier.classifier (classifier_key, code, name, created_by)
SELECT nextval('classifier.seq_classifier_key'), 'RTK', 'Riikide ja territooriumide klassifikaator', 'bootstrap'
WHERE NOT EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'RTK');

INSERT INTO classifier.classifier (classifier_key, code, name, created_by)
SELECT nextval('classifier.seq_classifier_key'), 'TEST', 'Test Classifier', 'bootstrap'
WHERE NOT EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'TEST');

-- ============================================================
-- Classifier values — RTK (3 valid + 1 expired for isValid tests)
-- ============================================================
INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, created_by)
SELECT nextval('classifier.seq_classifier_value_key'),
       (SELECT classifier_key FROM classifier.classifier WHERE code = 'RTK' ORDER BY created_at DESC LIMIT 1),
       v.code, v.name, v.vf::DATE, v.vu::DATE, 'bootstrap'
FROM (VALUES
    ('EE', 'Eesti',             '2024-01-01'::DATE, NULL::DATE),
    ('LV', 'Läti',              '2024-01-01'::DATE, NULL::DATE),
    ('LT', 'Leedu',             '2024-01-01'::DATE, NULL::DATE),
    ('FI', 'Soome (aegunud)',   '2019-01-01'::DATE, '2020-01-01'::DATE)
) AS v(code, name, vf, vu)
WHERE NOT EXISTS (
    SELECT 1 FROM classifier.classifier_value cv2
    JOIN classifier.classifier c2 ON c2.classifier_key = cv2.classifier_key
    WHERE c2.code = 'RTK' AND cv2.code = v.code
);

-- ============================================================
-- Classifier values — TEST (2 valid + 1 expired)
-- ============================================================
INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, created_by)
SELECT nextval('classifier.seq_classifier_value_key'),
       (SELECT classifier_key FROM classifier.classifier WHERE code = 'TEST' ORDER BY created_at DESC LIMIT 1),
       v.code, v.name, v.vf::DATE, v.vu::DATE, 'bootstrap'
FROM (VALUES
    ('VALUE_A', 'Testiväärtus A',           '2024-01-01'::DATE, NULL::DATE),
    ('VALUE_B', 'Testiväärtus B',           '2024-01-01'::DATE, NULL::DATE),
    ('VALUE_C', 'Testiväärtus C (aegunud)', '2019-01-01'::DATE, '2020-01-01'::DATE)
) AS v(code, name, vf, vu)
WHERE NOT EXISTS (
    SELECT 1 FROM classifier.classifier_value cv2
    JOIN classifier.classifier c2 ON c2.classifier_key = cv2.classifier_key
    WHERE c2.code = 'TEST' AND cv2.code = v.code
);

COMMIT;
