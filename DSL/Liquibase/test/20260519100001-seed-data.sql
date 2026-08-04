-- liquibase formatted sql
-- changeset ljvis:20260330100001 ignore:true
-- Seed data (v2 denormalized snapshot model)

-- organisations
INSERT INTO users.organisation (name, code, created_by)
VALUES
    ('Politsei- ja Piirivalveamet',                    'PPA',  'SYSTEM'),
    ('Tööinspektsioon',                                'TI',   'SYSTEM'),
    ('Maksu- ja Tolliamet',                            'MTA',  'SYSTEM'),
    ('Eesti Rahvusvaheliste Autovedajate Assotsiatsioon', 'ERAA', 'SYSTEM'),
    ('Kliimaministeerium',                             'KLIM', 'SYSTEM'),
    ('Transpordiamet',                                 'TRAM', 'SYSTEM')
;
-- permissions catalogue
INSERT INTO users.permission (code, description, created_by) VALUES ('user_group.list.admin',          'Kasutajagruppide nimekirja vaatamine kõigi asutuste ulatuses',                             'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('user_group.list.local',          'Kasutajagruppide nimekirja vaatamine ainult oma asutusega seotud gruppidele',              'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('user_group.read.admin',          'Kasutajagrupi detailvaate algandmete vaatamine kõigi gruppide ulatuses',                   'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('user_group.read.local',          'Kasutajagrupi detailvaate algandmete vaatamine ainult oma asutusega seotud gruppidele',    'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('user_group.create',              'Uue kasutajagrupi loomine',                                                               'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('user_group.update',              'Kasutajagrupi nimetuse, asutuste ja õiguste-seoste muutmine',                             'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('user_group.list_users.admin',    'Kasutajagrupi liikmete pagineeritud nimekiri kõigi asutuste ulatuses',                    'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('user_group.list_users.local',    'Kasutajagrupi liikmete pagineeritud nimekiri ainult oma asutuse kasutajatele',             'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('user_group.search_eligible_users','Gruppi sidumiseks sobivate kasutajate otsimine',                                         'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('user_group.add_user',            'Kasutaja(te) sidumine kasutajagrupiga',                                                   'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('user_group.remove_user',         'Kasutaja eemaldamine kasutajagrupist',                                                    'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('user.list.admin',                'Kasutajate nimekirja vaatamine kõigi asutuste ulatuses',                                  'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('user.list.local',                'Kasutajate nimekirja vaatamine ainult oma asutuse kasutajatele',                          'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('user.read.admin',                'Kasutaja andmete vaatamine kõigi asutuste ulatuses',                                      'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('user.read.local',                'Kasutaja andmete vaatamine ainult oma asutuse kasutajatele',                              'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('user.edit.admin',                'Kasutaja lisamine, vaatamine ja muutmine kõigi asutuste ulatuses',                        'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('user.edit.local',                'Kasutaja lisamine, vaatamine ja muutmine ainult oma asutuse kasutajatele',                 'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('organisation.list',              'Asutuste kataloogi laadimine UI valikute jaoks (modaalid, akordionite tabelid)',           'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('permission.list',                'Õiguste kataloogi laadimine UI valikute jaoks (kasutatakse ainult muutmisrežiimis)',       'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('classifier.list',                'Klassifikaatorite nimekirja detailvaate vaatamine',                                        'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('classifier.read',                'Klassifikaatori detailvaate vaatamine',                                                    'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('classifier.edit',                'Klassifikaatori nimetuse ja selgituse muutmine',                                           'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('classifier_value.edit',          'Klassifikaatorile uue väärtuse loomine ja väärtuse kehtivusperioodi muutmine',             'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('audit.read',                     'Auditilogi kirjete vaatamine, filtreerimine, sorteerimine ja eksportimine CSV-failina',    'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('foreign_violation_form.write',   'Välisriigi rikkumise andmevormi vormi loomine, täitmine, salvestamine ja failide üleslaadimine', 'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('foreign_violation_form.read',    'Välisriigi rikkumise andmevormi vormi andmete lugemine ja failide allalaadimine',          'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('compound_form.write',   'Üldosa andmete salvestamine', 'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('compound_form.read',    'Üldosa andmete lugemine', 'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('control_form.edit_locked',    'Lukustatud (kinnitatud või avalikustatud) koondvormi üldosa ja kõigi alamvormide andmete muutmine', 'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('control_form.delete',    'Koondvormi kustutamine koos kõigi alamvormidega', 'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('control_form.view_unpublished',    'Avaldamata (salvestatud/kinnitatud) koondvormide vaatamine muu isku poolt, kui vormi looja/kinnitaja', 'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('sp_driver_form.write',    'Autojuhi sõidu- ja puhkeaja alamvormi täitmine ja salvestamine', 'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('sp_driver_form.read',    'Autojuhi sõidu- ja puhkeaja alamvormi andmete lugemine', 'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('sp_teammate_form.write',    'Meeskonnaliikme sõidu- ja puhkeaja alamvormi täitmine ja salvestamine', 'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('sp_teammate_form.read',    'Meeskonnaliikme sõidu- ja puhkeaja alamvormi andmete lugemine', 'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('labour_inspection_form.write',   'Tööinspektsiooni kontrollakti loomine, täitmine, salvestamine ja kinnitamine', 'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('labour_inspection_form.read',    'Tööinspektsiooni kontrollakti andmete lugemine', 'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('vehicle_technical_form.write',   'Mootorsõiduki tehnonõuetele vastavuse alamvormi täitmine ja salvestamine', 'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('vehicle_technical_form.read',    'Mootorsõiduki tehnonõuetele vastavuse alamvormi andmete lugemine', 'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('trailer_technical_form.write',   'Haagise tehnonõuetele vastavuse alamvormi täitmine ja salvestamine', 'ljvis2');
INSERT INTO users.permission (code, description, created_by) VALUES ('trailer_technical_form.read',    'Haagise tehnonõuetele vastavuse alamvormi andmete lugemine', 'ljvis2');

-- user_groups — single full snapshot per group (v2: organisations + permissions embedded as JSONB)
-- user_group_key = 1: Super Admin Group
INSERT INTO users.user_group (user_group_key, name, organisations, permissions, created_by)
VALUES (
    nextval('users.seq_user_group_key'),
    'Super Admin Group',
    ARRAY[1, 2, 3]::BIGINT[],
    ARRAY['user_group.list.admin','user_group.read.admin','user_group.read.local','user_group.create','user_group.update','user_group.list_users.admin','user_group.search_eligible_users','user_group.add_user','user_group.remove_user','user.list.admin','user.read.admin','user.edit.admin','organisation.list','permission.list','classifier.read','labour_inspection_form.write','labour_inspection_form.read','control_form.view_unpublished','control_form.delete','control_form.edit_locked','compound_form.write','compound_form.read','vehicle_technical_form.write','vehicle_technical_form.read','trailer_technical_form.write','trailer_technical_form.read']::TEXT[],
    'ljvis2'
);

-- user_group_key = 2: Local Admin Group
INSERT INTO users.user_group (user_group_key, name, organisations, permissions, created_by)
VALUES (
    nextval('users.seq_user_group_key'),
    'Local Admin Group',
    ARRAY[1]::BIGINT[],
    ARRAY['user_group.list.local','user_group.read.local','user_group.create','user_group.update','user_group.list_users.local','user_group.search_eligible_users','user_group.add_user','user_group.remove_user','user.list.local','user.read.local','user.edit.local','organisation.list','permission.list']::TEXT[],
    'ljvis2'
);

-- user_accounts — single full snapshot per user (v2: all fields + user_groups as JSONB array of user_group_key values)
-- user_account_key = 1: Super Admin (60001019906) — member of groups 1 and 2
INSERT INTO users.user_account (
    user_account_key, personal_code, first_name, last_name,
    organisation_id, organisation_name, structural_unit, job_title,
    email, phone, access_start, status, user_groups, created_by
) VALUES (
    nextval('users.seq_user_account_key'),
    '60001019906', 'Admin', 'Super',
    1, 'Politsei- ja Piirivalveamet', 'PPA_LOUNA', 'Spetsialist',
    'admin.super@just.ee', '56789012', '2026-01-01', 'active', ARRAY[1,2]::BIGINT[], 'ljvis2'
);

-- user_account_key = 2: Org Admin (60001017727) — member of group 2
INSERT INTO users.user_account (
    user_account_key, personal_code, first_name, last_name,
    organisation_id, organisation_name, structural_unit, job_title,
    email, phone, access_start, status, user_groups, created_by
) VALUES (
    nextval('users.seq_user_account_key'),
    '60001017727', 'Org', 'Admin',
    6, 'Transpordiamet', 'TRAM', 'Spetsialist',
    'org.admin@kollane.ee', '123', '2026-02-02', 'active', ARRAY[2]::BIGINT[], 'ljvis2'
);

-- user_account_key = 3: Mari Tamm (60001017869) — no groups
INSERT INTO users.user_account (
    user_account_key, personal_code, first_name, last_name,
    organisation_id, organisation_name, structural_unit, job_title,
    email, phone, access_start, status, user_groups, created_by
) VALUES (
    nextval('users.seq_user_account_key'),
    '60001017869', 'Mari', 'Tamm',
    5, 'Kliimaministeerium', 'KLIM_HQ', 'Teadur',
    'mari.tamm@roheline.ee', '56789012', '2025-01-01', 'active', '{}'::BIGINT[], 'ljvis2'
);
