-- liquibase formatted sql
-- changeset ljvis:20260828300000 splitStatements:false
--
-- Toodangu organisatsioonid: PPA, TI, MTA, ERAA, KLIM, TRAM.
-- CI-only asutused (JUM, CBO) on seed_test_data.sql-is ja siia ei kuulu.
-- Idempotentne: ON CONFLICT (code) DO NOTHING.

INSERT INTO users.organisation (name, code, created_by) VALUES
    ('Politsei- ja Piirivalveamet',                      'PPA',  'ljvis2'),
    ('Tööinspektsioon',                                  'TI',   'ljvis2'),
    ('Maksu- ja Tolliamet',                              'MTA',  'ljvis2'),
    ('Eesti Rahvusvaheliste Autovedajate Assotsiatsioon','ERAA', 'ljvis2'),
    ('Kliimaministeerium',                               'KLIM', 'ljvis2'),
    ('Transpordiamet',                                   'TRAM', 'ljvis2')
ON CONFLICT (code) DO NOTHING;
