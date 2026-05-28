-- liquibase formatted sql
-- changeset ljvis:20260330100001 ignore:true
-- Seed data

INSERT INTO ljvis2.organisation (name, code, created_by) VALUES ('Justiitsministeerium', 'JUM', 'ljvis2');
INSERT INTO ljvis2.organisation (name, code, created_by) VALUES ('Sotsiaalministeerium', 'SOT', 'ljvis2');
INSERT INTO ljvis2.organisation (name, code, created_by) VALUES ('Haridusministeerium', 'HAR', 'ljvis2');

INSERT INTO ljvis2.user_account (personal_code, created_by) VALUES ('38001085718',  'ljvis2');
INSERT INTO ljvis2.user_account (personal_code, created_by) VALUES ('48004115799',  'ljvis2');
INSERT INTO ljvis2.user_account (personal_code, created_by) VALUES ('39001011234',  'ljvis2');

INSERT INTO ljvis2.user_account_data_state (user_account_id, first_name, last_name, organisation_id, email, phone, structural_unit, job_title, access_start, created_by) VALUES (1, 'Admin', 'Super', 1, 'admin.super@just.ee', '56789012', 'LÕUNA PREFEKTUUR', 'Spetsialist', '2026-01-01', 'ljvis2');
INSERT INTO ljvis2.user_account_data_state (user_account_id, first_name, last_name, organisation_id, email, phone, structural_unit, job_title, access_start, created_by) VALUES (2, 'Org', 'Admin', 2, 'org.admin@kollane.ee', '123', 'IDA PREFEKTUUR', 'Spetsialist', '2026-02-02', 'ljvis2');
INSERT INTO ljvis2.user_account_data_state (user_account_id, first_name, last_name, organisation_id, email, phone, structural_unit, job_title, access_start, created_by) VALUES (3, 'Mari', 'Tamm', 3, 'mari.tamm@roheline.ee', '56789012', 'KLIM', 'Teadur', '2025-01-01', 'ljvis2');

INSERT INTO ljvis2.user_account_state (user_account_id, status, created_by) VALUES (1 ,'active', 'ljvis2');
INSERT INTO ljvis2.user_account_state (user_account_id, status, created_by) VALUES (2 ,'active', 'ljvis2');
INSERT INTO ljvis2.user_account_state (user_account_id, status, created_by) VALUES (3 ,'active', 'ljvis2');

INSERT INTO ljvis2.user_group (created_by) VALUES ('ljvis2');
INSERT INTO ljvis2.user_group (created_by) VALUES ('ljvis2');

INSERT INTO ljvis2.user_group_name_state (user_group_id, name, created_by) VALUES (1, 'Super Admin Group', 'ljvis2');
INSERT INTO ljvis2.user_group_name_state (user_group_id, name, created_by) VALUES (2, 'Local Admin Group', 'ljvis2');

INSERT INTO ljvis2.permission (code, description, created_by) VALUES ('user_group.list.admin', 'Kasutajagruppide nimekirja vaatamine kõigi asutuste ulatuses', 'ljvis2');
INSERT INTO ljvis2.permission (code, description, created_by) VALUES ('user_group.list.local', 'Kasutajagruppide nimekirja vaatamine ainult oma asutusega seotud gruppidele', 'ljvis2');
INSERT INTO ljvis2.permission (code, description, created_by) VALUES ('user_group.read.admin', 'Kasutajagrupi detailvaate algandmete vaatamine kõigi gruppide ulatuses', 'ljvis2');
INSERT INTO ljvis2.permission (code, description, created_by) VALUES ('user_group.read.local', 'Kasutajagrupi detailvaate algandmete vaatamine ainult oma asutusega seotud gruppidele', 'ljvis2');
INSERT INTO ljvis2.permission (code, description, created_by) VALUES ('user_group.create', 'Uue kasutajagrupi loomine', 'ljvis2');
INSERT INTO ljvis2.permission (code, description, created_by) VALUES ('user_group.update', 'Kasutajagrupi nimetuse, asutuste ja õiguste-seoste muutmine', 'ljvis2');
INSERT INTO ljvis2.permission (code, description, created_by) VALUES ('user_group.list_users.admin', 'Kasutajagrupi liikmete pagineeritud nimekiri kõigi asutuste ulatuses', 'ljvis2');
INSERT INTO ljvis2.permission (code, description, created_by) VALUES ('user_group.list_users.local', 'Kasutajagrupi liikmete pagineeritud nimekiri ainult oma asutuse kasutajatele', 'ljvis2');
INSERT INTO ljvis2.permission (code, description, created_by) VALUES ('user_group.search_eligible_users', 'Gruppi sidumiseks sobivate kasutajate otsimine', 'ljvis2');
INSERT INTO ljvis2.permission (code, description, created_by) VALUES ('user_group.add_user', 'Kasutaja(te) sidumine kasutajagrupiga', 'ljvis2');
INSERT INTO ljvis2.permission (code, description, created_by) VALUES ('user_group.remove_user', 'Kasutaja eemaldamine kasutajagrupist', 'ljvis2');
INSERT INTO ljvis2.permission (code, description, created_by) VALUES ('user.list.admin', 'Kasutajate nimekirja vaatamine kõigi asutuste ulatuses', 'ljvis2');
INSERT INTO ljvis2.permission (code, description, created_by) VALUES ('user.list.local', 'Kasutajate nimekirja vaatamine ainult oma asutuse kasutajatele', 'ljvis2');
INSERT INTO ljvis2.permission (code, description, created_by) VALUES ('user.read.admin', 'Kasutaja andmete vaatamine kõigi asutuste ulatuses', 'ljvis2');
INSERT INTO ljvis2.permission (code, description, created_by) VALUES ('user.read.local', 'Kasutaja andmete vaatamine ainult oma asutuse kasutajatele', 'ljvis2');
INSERT INTO ljvis2.permission (code, description, created_by) VALUES ('user.edit.admin', 'Kasutaja lisamine, vaatamine ja muutmine kõigi asutuste ulatuses', 'ljvis2');
INSERT INTO ljvis2.permission (code, description, created_by) VALUES ('user.edit.local', 'Kasutaja lisamine, vaatamine ja muutmine ainult oma asutuse kasutajatele', 'ljvis2');
INSERT INTO ljvis2.permission (code, description, created_by) VALUES ('organisation.list', 'Asutuste kataloogi laadimine UI valikute jaoks (modaalid, akordionite tabelid)', 'ljvis2');
INSERT INTO ljvis2.permission (code, description, created_by) VALUES ('permission.list', 'Õiguste kataloogi laadimine UI valikute jaoks (kasutatakse ainult muutmisrežiimis)', 'ljvis2');

INSERT INTO ljvis2.user_account_user_group (user_account_id, user_group_id, created_by) VALUES (1, 1, 'ljvis2');
INSERT INTO ljvis2.user_account_user_group (user_account_id, user_group_id, created_by) VALUES (1, 2, 'ljvis2');
INSERT INTO ljvis2.user_account_user_group (user_account_id, user_group_id, created_by) VALUES (2, 2, 'ljvis2');

INSERT INTO ljvis2.user_account_user_group_state (user_account_user_group_id, status, created_by) VALUES (1, 'active', 'ljvis2');
INSERT INTO ljvis2.user_account_user_group_state (user_account_user_group_id, status, created_by) VALUES (2, 'active', 'ljvis2');
INSERT INTO ljvis2.user_account_user_group_state (user_account_user_group_id, status, created_by) VALUES (3, 'active', 'ljvis2');

INSERT INTO ljvis2.user_group_organisation (user_group_id, organisation_id, created_by) VALUES (1, 1, 'ljvis2');
INSERT INTO ljvis2.user_group_organisation (user_group_id, organisation_id, created_by) VALUES (1, 2, 'ljvis2');
INSERT INTO ljvis2.user_group_organisation (user_group_id, organisation_id, created_by) VALUES (1, 3, 'ljvis2');
INSERT INTO ljvis2.user_group_organisation (user_group_id, organisation_id, created_by) VALUES (2, 1, 'ljvis2');

INSERT INTO ljvis2.user_group_organisation_state (user_group_organisation_id, status, created_by) VALUES (1, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_organisation_state (user_group_organisation_id, status, created_by) VALUES (2, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_organisation_state (user_group_organisation_id, status, created_by) VALUES (3, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_organisation_state (user_group_organisation_id, status, created_by) VALUES (4, 'active', 'ljvis2');

INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by) VALUES (1, 1, 'ljvis2');
INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by) VALUES (1, 3, 'ljvis2');
INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by) VALUES (1, 4, 'ljvis2');
INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by) VALUES (1, 5, 'ljvis2');
INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by) VALUES (1, 6, 'ljvis2');
INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by) VALUES (1, 7, 'ljvis2');
INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by) VALUES (1, 9, 'ljvis2');
INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by) VALUES (1, 10, 'ljvis2');
INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by) VALUES (1, 11, 'ljvis2');
INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by) VALUES (1, 12, 'ljvis2');
INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by) VALUES (1, 14, 'ljvis2');
INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by) VALUES (1, 16, 'ljvis2');
INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by) VALUES (1, 18, 'ljvis2');
INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by) VALUES (1, 19, 'ljvis2');
INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by) VALUES (2, 2, 'ljvis2');
INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by) VALUES (2, 4, 'ljvis2');
INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by) VALUES (2, 5, 'ljvis2');
INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by) VALUES (2, 6, 'ljvis2');
INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by) VALUES (2, 8, 'ljvis2');
INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by) VALUES (2, 9, 'ljvis2');
INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by) VALUES (2, 10, 'ljvis2');
INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by) VALUES (2, 11, 'ljvis2');
INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by) VALUES (2, 13, 'ljvis2');
INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by) VALUES (2, 15, 'ljvis2');
INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by) VALUES (2, 17, 'ljvis2');
INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by) VALUES (2, 18, 'ljvis2');
INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by) VALUES (2, 19, 'ljvis2');

INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by) VALUES (1, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by) VALUES (2, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by) VALUES (3, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by) VALUES (4, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by) VALUES (5, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by) VALUES (6, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by) VALUES (7, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by) VALUES (8, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by) VALUES (9, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by) VALUES (10, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by) VALUES (11, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by) VALUES (12, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by) VALUES (13, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by) VALUES (14, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by) VALUES (15, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by) VALUES (16, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by) VALUES (17, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by) VALUES (18, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by) VALUES (19, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by) VALUES (20, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by) VALUES (21, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by) VALUES (22, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by) VALUES (23, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by) VALUES (24, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by) VALUES (25, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by) VALUES (26, 'active', 'ljvis2');
INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by) VALUES (27, 'active', 'ljvis2');

INSERT INTO ljvis2.user_account_latest (user_account_id, personal_code, first_name, last_name, email, phone, structural_unit, job_title, organisation_id, organisation_name, access_start, status, user_groups, created_by)
VALUES (1, '38001085718', 'Admin', 'Super', 'admin.super@just.ee', '56789012', 'LÕUNA PREFEKTUUR', 'Spetsialist', 1, 'Justiitsministeerium', '2026-01-01', 'active', '[{"id":1,"name":"Super Admin Group"},{"id":2,"name":"Local Admin Group"}]', 'ljvis2');
INSERT INTO ljvis2.user_account_latest (user_account_id, personal_code, first_name, last_name, email, phone, structural_unit, job_title, organisation_id, organisation_name, access_start, status, user_groups, created_by)
VALUES (2, '48004115799', 'Org', 'Admin', 'org.admin@kollane.ee', '123', 'IDA PREFEKTUUR', 'Spetsialist', 2, 'Sotsiaalministeerium', '2026-02-02', 'active', '[{"id":2,"name":"Local Admin Group"}]', 'ljvis2');
INSERT INTO ljvis2.user_account_latest (user_account_id, personal_code, first_name, last_name, email, phone, structural_unit, job_title, organisation_id, organisation_name, access_start, status, user_groups, created_by)
VALUES (3, '39001011234', 'Mari', 'Tamm', 'mari.tamm@roheline.ee', '56789012', 'KLIM', 'Teadur', 3, 'Haridusministeerium', '2025-01-01', 'active', '[]', 'ljvis2');

INSERT INTO ljvis2.user_group_latest (user_group_id, name, organisations, covers_all_organisations, permissions, created_by)
VALUES (1, 'Super Admin Group',
        '[{"id":1,"name":"Justiitsministeerium"},{"id":2,"name":"Sotsiaalministeerium"},{"id":3,"name":"Haridusministeerium"}]',
        true,
        '[{"id":1,"code":"user_group.list.admin"},{"id":3,"code":"user_group.read.admin"},{"id":4,"code":"user_group.read.local"},{"id":5,"code":"user_group.create"},{"id":6,"code":"user_group.update"},{"id":7,"code":"user_group.list_users.admin"},{"id":9,"code":"user_group.search_eligible_users"},{"id":10,"code":"user_group.add_user"},{"id":11,"code":"user_group.remove_user"},{"id":12,"code":"user.list.admin"},{"id":14,"code":"user.read.admin"},{"id":16,"code":"user.edit.admin"},{"id":18,"code":"organisation.list"},{"id":19,"code":"permission.list"}]',
        'ljvis2');
INSERT INTO ljvis2.user_group_latest (user_group_id, name, organisations, covers_all_organisations, permissions, created_by)
VALUES (2, 'Local Admin Group',
        '[{"id":1,"name":"Justiitsministeerium"}]',
        false,
        '[{"id":2,"code":"user_group.list.local"},{"id":4,"code":"user_group.read.local"},{"id":5,"code":"user_group.create"},{"id":6,"code":"user_group.update"},{"id":8,"code":"user_group.list_users.local"},{"id":9,"code":"user_group.search_eligible_users"},{"id":10,"code":"user_group.add_user"},{"id":11,"code":"user_group.remove_user"},{"id":13,"code":"user.list.local"},{"id":15,"code":"user.read.local"},{"id":17,"code":"user.edit.local"},{"id":18,"code":"organisation.list"},{"id":19,"code":"permission.list"}]',
        'ljvis2');
