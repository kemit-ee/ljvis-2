-- ============================================================================
-- Test seed data for permission testing
-- Run manually: PGPASSWORD=01234 psql -h localhost -p 54321 -U ljvis -d ljvis_db -f DSL/Liquibase/test/seed-test-users.sql
-- ============================================================================


BEGIN;

-- ============================================================================
-- 1. Organisations
-- ============================================================================
INSERT INTO users.organisation (name) VALUES ('Justiitsministeerium');
INSERT INTO users.organisation (name) VALUES ('Sotsiaalministeerium');
INSERT INTO users.organisation (name) VALUES ('Haridusministeerium');

-- ============================================================================
-- 1. User Groups
-- ============================================================================
-- "Super Admin Group" already exists (5816ebae-04dd-4730-a855-74fcce283404)
-- Create "Local Admin Group" for org-level admins
INSERT INTO users.user_group (id, name) VALUES
  ('b0000000-aaaa-0000-0000-000000000001', 'Local Admin Group')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 2. Assign permissions to groups
-- ============================================================================
-- Super Admin Group → all *_admin permissions (ensure all are assigned)
INSERT INTO users.user_group_permission (user_group_id, permission_id)
SELECT '5816ebae-04dd-4730-a855-74fcce283404', id FROM users.permission WHERE code LIKE '%_admin'
ON CONFLICT (user_group_id, permission_id) DO NOTHING;

-- Local Admin Group → all *_local permissions
INSERT INTO users.user_group_permission (user_group_id, permission_id)
SELECT 'b0000000-aaaa-0000-0000-000000000001', id FROM users.permission WHERE code LIKE '%_local'
ON CONFLICT (user_group_id, permission_id) DO NOTHING;

-- ============================================================================
-- 3. Link groups to organisations
-- ============================================================================
-- Super Admin Group → all organisations
INSERT INTO users.user_group_organisation (user_group_id, organisation_id)
SELECT '5816ebae-04dd-4730-a855-74fcce283404', id FROM users.organisation
ON CONFLICT (user_group_id, organisation_id) DO NOTHING;

-- Local Admin Group → Justiitsministeerium only
INSERT INTO users.user_group_organisation (user_group_id, organisation_id)
SELECT 'b0000000-aaaa-0000-0000-000000000001', id FROM users.organisation WHERE name = 'Justiitsministeerium'
ON CONFLICT (user_group_id, organisation_id) DO NOTHING;

-- ============================================================================
-- 4. Users
-- ============================================================================
-- ljvis_admin (Keycloak ID: c1a70b17-f352-4f0a-8391-9e893589af39)
-- Global admin, sees everything
INSERT INTO users."user" (id, first_name, last_name, personal_code, organisation_id, email, phone, access_start, status)
SELECT
  'c0000000-0000-0000-0000-000000000001',
  'Admin', 'Kasutaja',
  'c1a70b17-f352-4f0a-8391-9e893589af39',
  (SELECT id FROM users.organisation WHERE name = 'Justiitsministeerium'),
  'admin@test.ee', '+372 5551111',
  CURRENT_DATE, 'active'
ON CONFLICT DO NOTHING;

-- ljvis_org_admin (Keycloak ID: 5e762aeb-663e-4cbc-a499-3adc07433cf1)
-- Local admin for Justiitsministeerium, sees only users in that org
INSERT INTO users."user" (id, first_name, last_name, personal_code, organisation_id, email, phone, access_start, status)
SELECT
  'c0000000-0000-0000-0000-000000000002',
  'Org', 'Haldur',
  '5e762aeb-663e-4cbc-a499-3adc07433cf1',
  (SELECT id FROM users.organisation WHERE name = 'Justiitsministeerium'),
  'org.admin@test.ee', '+372 5552222',
  CURRENT_DATE, 'active'
ON CONFLICT DO NOTHING;

-- Regular user in Justiitsministeerium (no permissions — visible to org_admin)
INSERT INTO users."user" (id, first_name, last_name, personal_code, organisation_id, email, phone, access_start, status)
SELECT
  'c0000000-0000-0000-0000-000000000003',
  'Jaan', 'Tamm',
  'EE39901011234',
  (SELECT id FROM users.organisation WHERE name = 'Justiitsministeerium'),
  'jaan.tamm@just.ee', '+372 5553333',
  CURRENT_DATE, 'active'
ON CONFLICT DO NOTHING;

-- Regular user in Sotsiaalministeerium (NOT visible to org_admin, visible to admin)
INSERT INTO users."user" (id, first_name, last_name, personal_code, organisation_id, email, phone, access_start, status)
SELECT
  'c0000000-0000-0000-0000-000000000004',
  'Kati', 'Kask',
  'EE49901015678',
  (SELECT id FROM users.organisation WHERE name = 'Sotsiaalministeerium'),
  'kati.kask@sotsiaal.ee', '+372 5554444',
  CURRENT_DATE, 'active'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. Assign users to groups
-- ============================================================================
-- ljvis_admin → Super Admin Group
INSERT INTO users.user_user_group (user_id, user_group_id) VALUES
  ('c0000000-0000-0000-0000-000000000001', '5816ebae-04dd-4730-a855-74fcce283404')
ON CONFLICT (user_id, user_group_id) DO NOTHING;

-- ljvis_org_admin → Local Admin Group
INSERT INTO users.user_user_group (user_id, user_group_id) VALUES
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-aaaa-0000-0000-000000000001')
ON CONFLICT (user_id, user_group_id) DO NOTHING;

-- Jaan and Kati have no groups (regular users, no permissions)

COMMIT;

-- ============================================================================
-- Expected test results:
-- ============================================================================
-- ljvis_admin (login as ljvis_admin in Keycloak):
--   - GET /users/list → sees ALL 4 users (+ any existing)
--   - GET /user-groups/list → sees all groups
--   - Can create/edit/delete users and groups
--
-- ljvis_org_admin (login as ljvis_org_admin in Keycloak):
--   - GET /users/list → sees ONLY Justiitsministeerium users (Admin, Org Haldur, Jaan)
--   - GET /user-groups/list → sees groups linked to Justiitsministeerium
--   - Can create/edit users, CANNOT manage groups (no *_group_edit_admin)
--
-- Jaan Tamm / Kati Kask (no Keycloak account, cannot login):
--   - No permissions, exist only as data for admin/org_admin to view
