-- liquibase formatted sql
-- changeset ljvis:20260828100000 splitStatements:false

INSERT INTO users.permission (code, description, created_by) VALUES
    ('user_group.list.admin',            'Kasutajagruppide nimekirja vaatamine kõigi asutuste ulatuses', 'ljvis2'),
    ('user_group.list.local',            'Kasutajagruppide nimekirja vaatamine ainult oma asutusega seotud gruppidele', 'ljvis2'),
    ('user_group.read.admin',            'Kasutajagrupi detailvaate algandmete vaatamine kõigi gruppide ulatuses', 'ljvis2'),
    ('user_group.read.local',            'Kasutajagrupi detailvaate algandmete vaatamine ainult oma asutusega seotud gruppidele', 'ljvis2'),
    ('user_group.create',                'Uue kasutajagrupi loomine', 'ljvis2'),
    ('user_group.update',                'Kasutajagrupi nimetuse, asutuste ja õiguste-seoste muutmine', 'ljvis2'),
    ('user_group.list_users.admin',      'Kasutajagrupi liikmete pagineeritud nimekiri kõigi asutuste ulatuses', 'ljvis2'),
    ('user_group.list_users.local',      'Kasutajagrupi liikmete pagineeritud nimekiri ainult oma asutuse kasutajatele', 'ljvis2'),
    ('user_group.search_eligible_users', 'Gruppi sidumiseks sobivate kasutajate otsimine', 'ljvis2'),
    ('user_group.add_user',              'Kasutaja(te) sidumine kasutajagrupiga', 'ljvis2'),
    ('user_group.remove_user',           'Kasutaja eemaldamine kasutajagrupist', 'ljvis2'),
    ('user.list.admin',                  'Kasutajate nimekirja vaatamine kõigi asutuste ulatuses', 'ljvis2'),
    ('user.list.local',                  'Kasutajate nimekirja vaatamine ainult oma asutuse kasutajatele', 'ljvis2'),
    ('user.read.admin',                  'Kasutaja andmete vaatamine kõigi asutuste ulatuses', 'ljvis2'),
    ('user.read.local',                  'Kasutaja andmete vaatamine ainult oma asutuse kasutajatele', 'ljvis2'),
    ('user.edit.admin',                  'Kasutaja lisamine, vaatamine ja muutmine kõigi asutuste ulatuses', 'ljvis2'),
    ('user.edit.local',                  'Kasutaja lisamine, vaatamine ja muutmine ainult oma asutuse kasutajatele', 'ljvis2'),
    ('organisation.list',                'Asutuste kataloogi laadimine UI valikute jaoks', 'ljvis2'),
    ('permission.list',                  'Õiguste kataloogi laadimine UI valikute jaoks', 'ljvis2')
ON CONFLICT (code) DO NOTHING;
