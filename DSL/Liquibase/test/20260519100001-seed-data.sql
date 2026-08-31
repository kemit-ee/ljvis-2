-- liquibase formatted sql
-- changeset ljvis:20260330100001 ignore:true
-- Seed data (v2 denormalized snapshot model)
-- Idempotent: safe to run on a clean DB or on top of the CI bootstrap (CBO/JUM/PPA).

-- organisations
INSERT INTO users.organisation (name, code, created_by)
VALUES
    ('Politsei- ja Piirivalveamet',                    'PPA',  'SYSTEM'),
    ('Tööinspektsioon',                                'TI',   'SYSTEM'),
    ('Maksu- ja Tolliamet',                            'MTA',  'SYSTEM'),
    ('Eesti Rahvusvaheliste Autovedajate Assotsiatsioon', 'ERAA', 'SYSTEM'),
    ('Kliimaministeerium',                             'KLIM', 'SYSTEM'),
    ('Transpordiamet',                                 'TRAM', 'SYSTEM')
ON CONFLICT (code) DO NOTHING;

-- permissions catalogue
INSERT INTO users.permission (code, description, created_by) VALUES ('user_group.list.admin',          'Kasutajagruppide nimekirja vaatamine kõigi asutuste ulatuses',                             'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('user_group.list.local',          'Kasutajagruppide nimekirja vaatamine ainult oma asutusega seotud gruppidele',              'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('user_group.read.admin',          'Kasutajagrupi detailvaate algandmete vaatamine kõigi gruppide ulatuses',                   'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('user_group.read.local',          'Kasutajagrupi detailvaate algandmete vaatamine ainult oma asutusega seotud gruppidele',    'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('user_group.create',              'Uue kasutajagrupi loomine',                                                               'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('user_group.update',              'Kasutajagrupi nimetuse, asutuste ja õiguste-seoste muutmine',                             'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('user_group.list_users.admin',    'Kasutajagrupi liikmete pagineeritud nimekiri kõigi asutuste ulatuses',                    'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('user_group.list_users.local',    'Kasutajagrupi liikmete pagineeritud nimekiri ainult oma asutuse kasutajatele',             'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('user_group.search_eligible_users','Gruppi sidumiseks sobivate kasutajate otsimine',                                         'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('user_group.add_user',            'Kasutaja(te) sidumine kasutajagrupiga',                                                   'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('user_group.remove_user',         'Kasutaja eemaldamine kasutajagrupist',                                                    'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('user.list.admin',                'Kasutajate nimekirja vaatamine kõigi asutuste ulatuses',                                  'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('user.list.local',                'Kasutajate nimekirja vaatamine ainult oma asutuse kasutajatele',                          'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('user.read.admin',                'Kasutaja andmete vaatamine kõigi asutuste ulatuses',                                      'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('user.read.local',                'Kasutaja andmete vaatamine ainult oma asutuse kasutajatele',                              'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('user.edit.admin',                'Kasutaja lisamine, vaatamine ja muutmine kõigi asutuste ulatuses',                        'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('user.edit.local',                'Kasutaja lisamine, vaatamine ja muutmine ainult oma asutuse kasutajatele',                 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('organisation.list',              'Asutuste kataloogi laadimine UI valikute jaoks (modaalid, akordionite tabelid)',           'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('permission.list',                'Õiguste kataloogi laadimine UI valikute jaoks (kasutatakse ainult muutmisrežiimis)',       'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('classifier.list',                'Klassifikaatorite nimekirja detailvaate vaatamine',                                        'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('classifier.read',                'Klassifikaatori detailvaate vaatamine',                                                    'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('classifier.edit',                'Klassifikaatori nimetuse ja selgituse muutmine',                                           'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('classifier_value.edit',          'Klassifikaatorile uue väärtuse loomine ja väärtuse kehtivusperioodi muutmine',             'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('audit.read',                     'Auditilogi kirjete vaatamine, filtreerimine, sorteerimine ja eksportimine CSV-failina',    'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('foreign_violation_form.write',   'Välisriigi rikkumise andmevormi vormi loomine, täitmine, salvestamine ja failide üleslaadimine', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('foreign_violation_form.read',    'Välisriigi rikkumise andmevormi vormi andmete lugemine ja failide allalaadimine',          'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('compound_form.write',   'Üldosa andmete salvestamine', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('compound_form.read',    'Üldosa andmete lugemine', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('control_form.edit_locked',    'Lukustatud (kinnitatud või avalikustatud) koondvormi üldosa ja kõigi alamvormide andmete muutmine', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('control_form.delete',    'Koondvormi kustutamine koos kõigi alamvormidega', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('control_form.view_unpublished',    'Avaldamata (salvestatud/kinnitatud) koondvormide vaatamine muu isku poolt, kui vormi looja/kinnitaja', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('sp_driver_form.write',    'Autojuhi sõidu- ja puhkeaja alamvormi täitmine ja salvestamine', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('sp_driver_form.read',    'Autojuhi sõidu- ja puhkeaja alamvormi andmete lugemine', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('sp_teammate_form.write',    'Meeskonnaliikme sõidu- ja puhkeaja alamvormi täitmine ja salvestamine', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('sp_teammate_form.read',    'Meeskonnaliikme sõidu- ja puhkeaja alamvormi andmete lugemine', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('labour_inspection_form.write',   'Tööinspektsiooni kontrollakti loomine, täitmine, salvestamine ja kinnitamine', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('labour_inspection_form.read',    'Tööinspektsiooni kontrollakti andmete lugemine', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('vehicle_technical_form.write',   'Mootorsõiduki tehnonõuetele vastavuse alamvormi täitmine ja salvestamine', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('vehicle_technical_form.read',    'Mootorsõiduki tehnonõuetele vastavuse alamvormi andmete lugemine', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('trailer_technical_form.write',   'Haagise tehnonõuetele vastavuse alamvormi täitmine ja salvestamine', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('trailer_technical_form.read',    'Haagise tehnonõuetele vastavuse alamvormi andmete lugemine', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('adr_form.write',   'ADR (ohtlik veos) alamvormi täitmine ja salvestamine', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('adr_form.read',    'ADR (ohtlik veos) alamvormi andmete lugemine', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('transport_interruption_form.write',   'Autoveo katkestamise alamvormi täitmine ja salvestamine', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('transport_interruption_form.read',    'Autoveo katkestamise alamvormi andmete lugemine', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('good_repute_form.write',   'Hea maine vormi täitmine, salvestamine ja failide üleslaadimine', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('good_repute_form.read',    'Hea maine vormi andmete lugemine ja failide allalaadimine', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('xtee.query.rahvastikuregister',    'Rahvastikuregistri päring isiku andmete leidmiseks isikukoodi alusel', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('ctud.read',                      'ERRU tegevusloa kontrolli (CTUD) päringu ja selle vastuse vaatamine', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('ctud.create',                    'ERRU tegevusloa kontrolli (CTUD) väljamineva päringu koostamine ja mustandi salvestamine', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('ctud.send',                      'ERRU tegevusloa kontrolli (CTUD) päringu saatmine ERRU-sse', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('cgr.read',                       'ERRU mainepäringu (CGR) päringu ja liikmesriikide koondvastuse vaatamine', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('cgr.create',                     'ERRU mainepäringu (CGR) väljamineva päringu koostamine ja mustandi salvestamine, sealhulgas olemasoleva päringu kopeerimine', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('cgr.send',                       'ERRU mainepäringu (CGR) päringu saatmine ERRU-sse, sealhulgas riigipõhine uuestisaatmine', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('rsi.read',                       'ERRU tehnokontrolli teate (RSI) ja selle vastuse vaatamine, sealhulgas teadete loend', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('rsi.create',                     'ERRU tehnokontrolli teate (RSI) väljamineva teate koostamine ja mustandi salvestamine, sealhulgas eeltäitmine kontrollkaardilt', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('rsi.send',                       'ERRU tehnokontrolli teate (RSI) saatmine ERRU-sse', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('ncr.read',    'ERRU kontrollitulemuse teate (NCR) ja selle vastuse vaatamine, sealhulgas teadete loend', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('ncr.create',  'ERRU kontrollitulemuse teate (NCR) väljamineva päringu koostamine ja mustandi salvestamine', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('ncr.respond', 'ERRU kontrollitulemuse teatele (NCR) sissetuleva teate vastuse koostamine ja mustandi salvestamine', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('ncr.send',    'ERRU kontrollitulemuse teate (NCR) päringu või vastuse saatmine ERRU-sse (sealhulgas vea korral uuesti saatmine)', 'ljvis2') ON CONFLICT (code) DO NOTHING;
INSERT INTO users.permission (code, description, created_by) VALUES ('risk_report.list', 'Veoettevõtjate riskitasemete loendi vaatamine ja filtreerimine (EL 2022/695)', 'ljvis2') ON CONFLICT (code) DO NOTHING;

-- user_groups — single full snapshot per group (v2: organisations + permissions embedded as JSONB)
-- Uses WHERE NOT EXISTS to be idempotent; organisations array resolved dynamically by code.
-- user_group_key = 1: Super Admin Group
INSERT INTO users.user_group (user_group_key, name, organisations, permissions, created_by)
SELECT
    nextval('users.seq_user_group_key'),
    'Super Admin Group',
    ARRAY(SELECT id FROM users.organisation WHERE code IN ('PPA','TI','MTA') ORDER BY id),
    ARRAY['user_group.list.admin','user_group.read.admin','user_group.read.local','user_group.create','user_group.update','user_group.list_users.admin','user_group.search_eligible_users','user_group.add_user','user_group.remove_user','user.list.admin','user.read.admin','user.edit.admin','organisation.list','permission.list','classifier.read','labour_inspection_form.write','labour_inspection_form.read','control_form.view_unpublished','control_form.delete','control_form.edit_locked','compound_form.write','compound_form.read','vehicle_technical_form.write','vehicle_technical_form.read','trailer_technical_form.write','trailer_technical_form.read','adr_form.write','adr_form.read','transport_interruption_form.write','transport_interruption_form.read','good_repute_form.write','good_repute_form.read','sp_driver_form.write','sp_driver_form.read','sp_teammate_form.write','sp_teammate_form.read','xtee.query.rahvastikuregister','ctud.read','ctud.create','ctud.send','cgr.read','cgr.create','cgr.send','rsi.read','rsi.create','rsi.send','ncr.read','ncr.create','ncr.respond','ncr.send','ncr.list','risk_report.list','notification.admin']::TEXT[],
    'ljvis2'
WHERE NOT EXISTS (SELECT 1 FROM users.user_group WHERE name = 'Super Admin Group');

-- user_group_key = 2: Local Admin Group
INSERT INTO users.user_group (user_group_key, name, organisations, permissions, created_by)
SELECT
    nextval('users.seq_user_group_key'),
    'Local Admin Group',
    ARRAY(SELECT id FROM users.organisation WHERE code = 'PPA' ORDER BY id),
    ARRAY['user_group.list.local','user_group.read.local','user_group.create','user_group.update','user_group.list_users.local','user_group.search_eligible_users','user_group.add_user','user_group.remove_user','user.list.local','user.read.local','user.edit.local','organisation.list','permission.list','ctud.read','ctud.create','cgr.read','cgr.create','rsi.read','rsi.create','ncr.read','ncr.create','ncr.respond','ncr.list']::TEXT[],
    'ljvis2'
WHERE NOT EXISTS (SELECT 1 FROM users.user_group WHERE name = 'Local Admin Group');

-- user_accounts — single full snapshot per user (v2: all fields + user_groups as JSONB array of user_group_key values)
-- organisation_id resolved by code; WHERE NOT EXISTS on personal_code for idempotency.
-- user_account_key = 1: Super Admin (60001019906) — member of groups 1 and 2
INSERT INTO users.user_account (
    user_account_key, personal_code, first_name, last_name,
    organisation_id, organisation_name, structural_unit, job_title,
    email, phone, access_start, status, user_groups, created_by
)
SELECT
    nextval('users.seq_user_account_key'),
    '60001019906', 'Admin', 'Super',
    (SELECT id FROM users.organisation WHERE code = 'PPA'), 'Politsei- ja Piirivalveamet', 'PPA_LOUNA', 'Spetsialist',
    'admin.super@just.ee', '56789012', '2026-01-01', 'active', ARRAY[1,2]::BIGINT[], 'ljvis2'
WHERE NOT EXISTS (SELECT 1 FROM users.user_account WHERE personal_code = '60001019906');

-- user_account_key = 2: Org Admin (60001017727) — member of group 2
INSERT INTO users.user_account (
    user_account_key, personal_code, first_name, last_name,
    organisation_id, organisation_name, structural_unit, job_title,
    email, phone, access_start, status, user_groups, created_by
)
SELECT
    nextval('users.seq_user_account_key'),
    '60001017727', 'Org', 'Admin',
    (SELECT id FROM users.organisation WHERE code = 'TRAM'), 'Transpordiamet', 'TRAM', 'Spetsialist',
    'org.admin@kollane.ee', '123', '2026-02-02', 'active', ARRAY[2]::BIGINT[], 'ljvis2'
WHERE NOT EXISTS (SELECT 1 FROM users.user_account WHERE personal_code = '60001017727');

-- user_account_key = 3: Mari Tamm (60001017869) — no groups
INSERT INTO users.user_account (
    user_account_key, personal_code, first_name, last_name,
    organisation_id, organisation_name, structural_unit, job_title,
    email, phone, access_start, status, user_groups, created_by
)
SELECT
    nextval('users.seq_user_account_key'),
    '60001017869', 'Mari', 'Tamm',
    (SELECT id FROM users.organisation WHERE code = 'KLIM'), 'Kliimaministeerium', 'KLIM_HQ', 'Teadur',
    'mari.tamm@roheline.ee', '56789012', '2025-01-01', 'active', '{}'::BIGINT[], 'ljvis2'
WHERE NOT EXISTS (SELECT 1 FROM users.user_account WHERE personal_code = '60001017869');
