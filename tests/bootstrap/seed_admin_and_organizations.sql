-- Bootstrap seed for CI functional tests.
-- Runs via psql AFTER Liquibase has applied schema ONLY (no seed data from Liquibase).
-- Seeds groups, permissions, organisations, users and latest snapshots.
-- NOT a Liquibase migration — plain SQL, idempotent.

BEGIN;

-- ============================================================
-- Organisations
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
-- User groups  (identity row + name state, paired via CTE)
-- ============================================================
WITH ins AS (
    INSERT INTO ljvis2.user_group (created_by)
    SELECT 'bootstrap'
    WHERE NOT EXISTS (
        SELECT 1 FROM ljvis2.user_group_name_state WHERE name = 'Super Admin Group'
    )
    RETURNING id
)
INSERT INTO ljvis2.user_group_name_state (user_group_id, name, created_by)
SELECT id, 'Super Admin Group', 'bootstrap' FROM ins;

WITH ins AS (
    INSERT INTO ljvis2.user_group (created_by)
    SELECT 'bootstrap'
    WHERE NOT EXISTS (
        SELECT 1 FROM ljvis2.user_group_name_state WHERE name = 'Local Admin Group'
    )
    RETURNING id
)
INSERT INTO ljvis2.user_group_name_state (user_group_id, name, created_by)
SELECT id, 'Local Admin Group', 'bootstrap' FROM ins;

-- ============================================================
-- Permissions
-- ============================================================
INSERT INTO ljvis2.permission (code, description, created_by) VALUES
    ('user_group.list.admin',          'Kasutajagruppide nimekirja vaatamine kõigi asutuste ulatuses', 'bootstrap'),
    ('user_group.list.local',          'Kasutajagruppide nimekirja vaatamine ainult oma asutusega seotud gruppidele', 'bootstrap'),
    ('user_group.read.admin',          'Kasutajagrupi detailvaate algandmete vaatamine kõigi gruppide ulatuses', 'bootstrap'),
    ('user_group.read.local',          'Kasutajagrupi detailvaate algandmete vaatamine ainult oma asutusega seotud gruppidele', 'bootstrap'),
    ('user_group.create',              'Uue kasutajagrupi loomine', 'bootstrap'),
    ('user_group.update',              'Kasutajagrupi nimetuse, asutuste ja õiguste-seoste muutmine', 'bootstrap'),
    ('user_group.list_users.admin',    'Kasutajagrupi liikmete pagineeritud nimekiri kõigi asutuste ulatuses', 'bootstrap'),
    ('user_group.list_users.local',    'Kasutajagrupi liikmete pagineeritud nimekiri ainult oma asutuse kasutajatele', 'bootstrap'),
    ('user_group.search_eligible_users', 'Gruppi sidumiseks sobivate kasutajate otsimine', 'bootstrap'),
    ('user_group.add_user',            'Kasutaja(te) sidumine kasutajagrupiga', 'bootstrap'),
    ('user_group.remove_user',         'Kasutaja eemaldamine kasutajagrupist', 'bootstrap'),
    ('user.list.admin',                'Kasutajate nimekirja vaatamine kõigi asutuste ulatuses', 'bootstrap'),
    ('user.list.local',                'Kasutajate nimekirja vaatamine ainult oma asutuse kasutajatele', 'bootstrap'),
    ('user.read.admin',                'Kasutaja andmete vaatamine kõigi asutuste ulatuses', 'bootstrap'),
    ('user.read.local',                'Kasutaja andmete vaatamine ainult oma asutuse kasutajatele', 'bootstrap'),
    ('user.edit.admin',                'Kasutaja lisamine, vaatamine ja muutmine kõigi asutuste ulatuses', 'bootstrap'),
    ('user.edit.local',                'Kasutaja lisamine, vaatamine ja muutmine ainult oma asutuse kasutajatele', 'bootstrap'),
    ('organisation.list',              'Asutuste kataloogi laadimine UI valikute jaoks', 'bootstrap'),
    ('permission.list',                'Õiguste kataloogi laadimine UI valikute jaoks', 'bootstrap')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- Group → permission links
-- ============================================================
INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by)
SELECT g.id, p.id, 'bootstrap'
FROM ljvis2.user_group_name_state gns
JOIN ljvis2.user_group g ON g.id = gns.user_group_id
JOIN ljvis2.permission p ON p.code IN (
    'user_group.list.admin', 'user_group.read.admin', 'user_group.read.local',
    'user_group.create', 'user_group.update', 'user_group.list_users.admin',
    'user_group.search_eligible_users', 'user_group.add_user', 'user_group.remove_user',
    'user.list.admin', 'user.read.admin', 'user.edit.admin',
    'organisation.list', 'permission.list'
)
WHERE gns.name = 'Super Admin Group'
  AND NOT EXISTS (
      SELECT 1 FROM ljvis2.user_group_permission
      WHERE user_group_id = g.id AND permission_id = p.id
  );

INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by)
SELECT g.id, p.id, 'bootstrap'
FROM ljvis2.user_group_name_state gns
JOIN ljvis2.user_group g ON g.id = gns.user_group_id
JOIN ljvis2.permission p ON p.code IN (
    'user_group.list.local', 'user_group.read.local',
    'user_group.create', 'user_group.update', 'user_group.list_users.local',
    'user_group.search_eligible_users', 'user_group.add_user', 'user_group.remove_user',
    'user.list.local', 'user.read.local', 'user.edit.local',
    'organisation.list', 'permission.list'
)
WHERE gns.name = 'Local Admin Group'
  AND NOT EXISTS (
      SELECT 1 FROM ljvis2.user_group_permission
      WHERE user_group_id = g.id AND permission_id = p.id
  );

INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by)
SELECT ugp.id, 'active', 'bootstrap'
FROM ljvis2.user_group_permission ugp
WHERE NOT EXISTS (
    SELECT 1 FROM ljvis2.user_group_permission_state WHERE user_group_permission_id = ugp.id
);

-- ============================================================
-- Group → organisation links
-- ============================================================
INSERT INTO ljvis2.user_group_organisation (user_group_id, organisation_id, created_by)
SELECT g.id, o.id, 'bootstrap'
FROM ljvis2.user_group_name_state gns
JOIN ljvis2.user_group g ON g.id = gns.user_group_id
CROSS JOIN ljvis2.organisation o
WHERE gns.name = 'Super Admin Group'
  AND NOT EXISTS (
      SELECT 1 FROM ljvis2.user_group_organisation
      WHERE user_group_id = g.id AND organisation_id = o.id
  );

INSERT INTO ljvis2.user_group_organisation (user_group_id, organisation_id, created_by)
SELECT g.id, o.id, 'bootstrap'
FROM ljvis2.user_group_name_state gns
JOIN ljvis2.user_group g ON g.id = gns.user_group_id
JOIN ljvis2.organisation o ON o.code = 'JUM'
WHERE gns.name = 'Local Admin Group'
  AND NOT EXISTS (
      SELECT 1 FROM ljvis2.user_group_organisation
      WHERE user_group_id = g.id AND organisation_id = o.id
  );

INSERT INTO ljvis2.user_group_organisation_state (user_group_organisation_id, status, created_by)
SELECT ugo.id, 'active', 'bootstrap'
FROM ljvis2.user_group_organisation ugo
WHERE NOT EXISTS (
    SELECT 1 FROM ljvis2.user_group_organisation_state WHERE user_group_organisation_id = ugo.id
);

-- ============================================================
-- Users  (personal_code matches docker/tara-mock/identities.json)
-- ============================================================
INSERT INTO ljvis2.user_account (personal_code, created_by)
SELECT '38001085718', 'bootstrap'
WHERE NOT EXISTS (SELECT 1 FROM ljvis2.user_account WHERE personal_code = '38001085718');

INSERT INTO ljvis2.user_account_data_state
    (user_account_id, first_name, last_name, organisation_id, email, phone, structural_unit, job_title, access_start, created_by)
SELECT ua.id, 'Super', 'Admin', o.id, 'super.admin@ljvis.test', '55500001', 'LÕUNA PREFEKTUUR', 'Spetsialist', '2024-01-01', 'bootstrap'
FROM ljvis2.user_account ua, ljvis2.organisation o
WHERE ua.personal_code = '38001085718' AND o.code = 'PPA'
  AND NOT EXISTS (SELECT 1 FROM ljvis2.user_account_data_state WHERE user_account_id = ua.id);

INSERT INTO ljvis2.user_account_state (user_account_id, status, created_by)
SELECT ua.id, 'active', 'bootstrap'
FROM ljvis2.user_account ua
WHERE ua.personal_code = '38001085718'
  AND NOT EXISTS (SELECT 1 FROM ljvis2.user_account_state WHERE user_account_id = ua.id);

-- ============================================================
-- User → group links
-- ============================================================
INSERT INTO ljvis2.user_account_user_group (user_account_id, user_group_id, created_by)
SELECT ua.id, g.id, 'bootstrap'
FROM ljvis2.user_account ua
JOIN ljvis2.user_group_name_state gns ON gns.name = 'Super Admin Group'
JOIN ljvis2.user_group g ON g.id = gns.user_group_id
WHERE ua.personal_code = '38001085718'
  AND NOT EXISTS (
      SELECT 1 FROM ljvis2.user_account_user_group
      WHERE user_account_id = ua.id AND user_group_id = g.id
  );

INSERT INTO ljvis2.user_account_user_group_state (user_account_user_group_id, status, created_by)
SELECT uaug.id, 'active', 'bootstrap'
FROM ljvis2.user_account_user_group uaug
WHERE NOT EXISTS (
    SELECT 1 FROM ljvis2.user_account_user_group_state WHERE user_account_user_group_id = uaug.id
);

-- ============================================================
-- Snapshots: user_account_latest
-- ============================================================
INSERT INTO ljvis2.user_account_latest
    (user_account_id, personal_code, first_name, last_name, email, phone, structural_unit, job_title,
     organisation_id, organisation_name, access_start, status, user_groups, created_by)
SELECT
    ua.id, ua.personal_code,
    ds.first_name, ds.last_name, ds.email, ds.phone, ds.structural_unit, ds.job_title,
    ds.organisation_id, o.name, ds.access_start, 'active',
    COALESCE(
        (SELECT JSONB_AGG(JSONB_BUILD_OBJECT('id', uaug.user_group_id, 'name',
             (SELECT n.name FROM ljvis2.user_group_name_state n
              WHERE n.user_group_id = uaug.user_group_id ORDER BY n.created_at DESC LIMIT 1)))
         FROM ljvis2.user_account_user_group uaug
         JOIN ljvis2.user_account_user_group_state uaugs ON uaugs.user_account_user_group_id = uaug.id
         WHERE uaug.user_account_id = ua.id AND uaugs.status = 'active'),
        '[]'::JSONB),
    'bootstrap'
FROM ljvis2.user_account ua
JOIN ljvis2.user_account_data_state ds ON ds.user_account_id = ua.id
JOIN ljvis2.organisation o ON o.id = ds.organisation_id
WHERE NOT EXISTS (SELECT 1 FROM ljvis2.user_account_latest WHERE user_account_id = ua.id);

-- ============================================================
-- Snapshots: user_group_latest
-- ============================================================
INSERT INTO ljvis2.user_group_latest
    (user_group_id, name, organisations, covers_all_organisations, permissions, created_by)
SELECT
    ug.id,
    (SELECT n.name FROM ljvis2.user_group_name_state n
     WHERE n.user_group_id = ug.id ORDER BY n.created_at DESC LIMIT 1),
    COALESCE(
        (SELECT JSONB_AGG(JSONB_BUILD_OBJECT('id', o.id, 'name', o.name) ORDER BY o.name)
         FROM ljvis2.user_group_organisation ugo
         JOIN ljvis2.user_group_organisation_state ugos ON ugos.user_group_organisation_id = ugo.id
         JOIN ljvis2.organisation o ON o.id = ugo.organisation_id
         WHERE ugo.user_group_id = ug.id AND ugos.status = 'active'),
        '[]'::JSONB),
    (SELECT COUNT(*)
     FROM ljvis2.user_group_organisation ugo2
     JOIN ljvis2.user_group_organisation_state ugos2 ON ugos2.user_group_organisation_id = ugo2.id
     WHERE ugo2.user_group_id = ug.id AND ugos2.status = 'active') = (SELECT COUNT(*) FROM ljvis2.organisation),
    COALESCE(
        (SELECT JSONB_AGG(JSONB_BUILD_OBJECT('id', p.id, 'code', p.code) ORDER BY p.id)
         FROM ljvis2.user_group_permission ugp
         JOIN ljvis2.user_group_permission_state ugps ON ugps.user_group_permission_id = ugp.id
         JOIN ljvis2.permission p ON p.id = ugp.permission_id
         WHERE ugp.user_group_id = ug.id AND ugps.status = 'active'),
        '[]'::JSONB),
    'bootstrap'
FROM ljvis2.user_group ug
WHERE NOT EXISTS (SELECT 1 FROM ljvis2.user_group_latest WHERE user_group_id = ug.id);

COMMIT;
