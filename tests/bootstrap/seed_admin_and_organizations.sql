-- Bootstrap seed: admin users + organisations for CI functional tests.
-- Runs via psql AFTER Liquibase has applied schema + permissions.
-- NOT a Liquibase migration — plain SQL, idempotent.

-- ============================================================
-- Organisations
-- ============================================================
INSERT INTO users.organisation (name)
SELECT 'CI Bootstrap Organisation'
WHERE NOT EXISTS (
  SELECT 1 FROM users.organisation WHERE name = 'CI Bootstrap Organisation'
);

INSERT INTO users.organisation (name)
SELECT 'Justiitsministeerium'
WHERE NOT EXISTS (
  SELECT 1 FROM users.organisation WHERE name = 'Justiitsministeerium'
);

INSERT INTO users.organisation (name)
SELECT 'Politsei- ja Piirivalveamet'
WHERE NOT EXISTS (
  SELECT 1 FROM users.organisation WHERE name = 'Politsei- ja Piirivalveamet'
);

-- ============================================================
-- User groups
-- ============================================================
INSERT INTO users.user_group (name)
SELECT 'CI Super Admin Group'
WHERE NOT EXISTS (
  SELECT 1 FROM users.user_group WHERE name = 'CI Super Admin Group'
);

INSERT INTO users.user_group (name)
SELECT 'CI Local Admin Group'
WHERE NOT EXISTS (
  SELECT 1 FROM users.user_group WHERE name = 'CI Local Admin Group'
);

-- ============================================================
-- Permissions → groups
-- ============================================================
INSERT INTO users.user_group_permission (user_group_id, permission_id)
SELECT g.id, p.id
FROM users.user_group g
CROSS JOIN users.permission p
WHERE g.name = 'CI Super Admin Group'
  AND p.code LIKE 'perm_%_admin'
ON CONFLICT (user_group_id, permission_id) DO NOTHING;

INSERT INTO users.user_group_permission (user_group_id, permission_id)
SELECT g.id, p.id
FROM users.user_group g
CROSS JOIN users.permission p
WHERE g.name = 'CI Local Admin Group'
  AND p.code LIKE 'perm_%_local'
ON CONFLICT (user_group_id, permission_id) DO NOTHING;

-- ============================================================
-- Users  (personal_code matches docker/tara-mock/identities.json)
-- ============================================================

-- Super Admin
INSERT INTO users."user" (first_name, last_name, personal_code, organisation_id, email, phone, access_start, status)
SELECT 'Super', 'Admin', '38001085718', o.id, 'super.admin@ljvis.test', '55500001', '2024-01-01', 'active'
FROM users.organisation o
WHERE o.name = 'Politsei- ja Piirivalveamet'
  AND NOT EXISTS (SELECT 1 FROM users."user" WHERE personal_code = '38001085718');

-- Org Admin
INSERT INTO users."user" (first_name, last_name, personal_code, organisation_id, email, phone, access_start, status)
SELECT 'Org', 'Admin', '48004115799', o.id, 'org.admin@ljvis.test', '55500002', '2024-01-01', 'active'
FROM users.organisation o
WHERE o.name = 'Justiitsministeerium'
  AND NOT EXISTS (SELECT 1 FROM users."user" WHERE personal_code = '48004115799');

-- Regular user (no group — for future role-based tests)
INSERT INTO users."user" (first_name, last_name, personal_code, organisation_id, email, phone, access_start, status)
SELECT 'Mari', 'Tamm', '39001011234', o.id, 'mari.tamm@ljvis.test', '55500003', '2024-01-01', 'active'
FROM users.organisation o
WHERE o.name = 'Justiitsministeerium'
  AND NOT EXISTS (SELECT 1 FROM users."user" WHERE personal_code = '39001011234');

-- ============================================================
-- Users → groups
-- ============================================================
INSERT INTO users.user_user_group (user_id, user_group_id)
SELECT u.id, g.id
FROM users."user" u
CROSS JOIN users.user_group g
WHERE u.personal_code = '38001085718'
  AND g.name = 'CI Super Admin Group'
ON CONFLICT (user_id, user_group_id) DO NOTHING;

INSERT INTO users.user_user_group (user_id, user_group_id)
SELECT u.id, g.id
FROM users."user" u
CROSS JOIN users.user_group g
WHERE u.personal_code = '48004115799'
  AND g.name = 'CI Local Admin Group'
ON CONFLICT (user_id, user_group_id) DO NOTHING;
