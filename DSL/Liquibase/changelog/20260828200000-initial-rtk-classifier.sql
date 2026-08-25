-- liquibase formatted sql
-- changeset ljvis:20260828200000 splitStatements:false
--
-- RTK — Riikide ja territooriumide klassifikaator (Euroopa Liidu 27 liikmesriiki).
-- Idempotentne: kui RTK klassifikaator juba eksisteerib, jäetakse INSERT vahele.
-- Väärtuste valid_from vastab EL liitumiskuupäevale.
-- CI seed (seed_test_data.sql) lisab lisaks testiväärtuse ZZ (kehtetu) — see ei dubleeri
-- prod andmeid, kuna ZZ ei kuulu EL liikmesriikide loetellu.

DO $$
DECLARE
    v_key BIGINT;
    v_val RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'RTK') THEN
        RAISE NOTICE 'RTK already exists, skipping';
        RETURN;
    END IF;

    INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
    VALUES (nextval('classifier.seq_classifier_key'), 'RTK',
            'Riikide ja territooriumide klassifikaator',
            'Euroopa Liidu liikmesriigid koos liitumiskuupäevadega (EÜ asutamisleping + laienemisnõukogude otsused)',
            'ljvis2')
    RETURNING classifier_key INTO v_key;

    FOR v_val IN
        SELECT * FROM (VALUES
            ('AT', 'Austria',       '1995-01-01'::date),
            ('BE', 'Belgia',        '1958-01-01'::date),
            ('BG', 'Bulgaaria',     '2007-01-01'::date),
            ('CY', 'Küpros',        '2004-05-01'::date),
            ('CZ', 'Tšehhi',        '2004-05-01'::date),
            ('DE', 'Saksamaa',      '1958-01-01'::date),
            ('DK', 'Taani',         '1973-01-01'::date),
            ('EE', 'Eesti',         '2004-05-01'::date),
            ('ES', 'Hispaania',     '1986-01-01'::date),
            ('FI', 'Soome',         '1995-01-01'::date),
            ('FR', 'Prantsusmaa',   '1958-01-01'::date),
            ('GR', 'Kreeka',        '1981-01-01'::date),
            ('HR', 'Horvaatia',     '2013-07-01'::date),
            ('HU', 'Ungari',        '2004-05-01'::date),
            ('IE', 'Iirimaa',       '1973-01-01'::date),
            ('IT', 'Itaalia',       '1958-01-01'::date),
            ('LT', 'Leedu',         '2004-05-01'::date),
            ('LU', 'Luksemburg',    '1958-01-01'::date),
            ('LV', 'Läti',          '2004-05-01'::date),
            ('MT', 'Malta',         '2004-05-01'::date),
            ('NL', 'Holland',       '1958-01-01'::date),
            ('PL', 'Poola',         '2004-05-01'::date),
            ('PT', 'Portugal',      '1986-01-01'::date),
            ('RO', 'Rumeenia',      '2007-01-01'::date),
            ('SE', 'Rootsi',        '1995-01-01'::date),
            ('SI', 'Sloveenia',     '2004-05-01'::date),
            ('SK', 'Slovakkia',     '2004-05-01'::date)
        ) AS t(code, name, valid_from)
    LOOP
        INSERT INTO classifier.classifier_value
            (classifier_value_key, classifier_key, code, name, valid_from, created_by)
        VALUES (nextval('classifier.seq_classifier_value_key'), v_key,
                v_val.code, v_val.name, v_val.valid_from, 'ljvis2');
    END LOOP;
END $$;
