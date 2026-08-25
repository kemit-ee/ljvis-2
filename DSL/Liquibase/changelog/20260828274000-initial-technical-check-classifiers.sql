-- liquibase formatted sql
-- changeset ljvis:20260828274000 splitStatements:false
--
-- Tehniline kontroll: TRAILER_CATEGORY, VEHICLE_CATEGORY, MASS_DIMENSION.
-- Idempotentne: olemasolevad klassifikaatorid jäetakse vahele.

DO $$
    DECLARE
        v_created_by    VARCHAR(100) := 'system';
        v_clf_key       BIGINT;       -- classifier_key for TRAILER_CATEGORY
        v_rec           RECORD;
    BEGIN

        IF EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'TRAILER_CATEGORY') THEN
            RAISE NOTICE 'TRAILER_CATEGORY already exists, skipping';
            CONTINUE;
        END IF;

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (
                   nextval('classifier.seq_classifier_key'),
                   'TRAILER_CATEGORY',
                   'Haagise kategooria',
                   'Haagise kategooriate klassifikaator (kontrollvormid 2012)',
                   v_created_by
               )
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN
            SELECT * FROM (VALUES
                               ('C_2012',     '(c) O3 (3,5-10t)'),
                               ('D_2012',     '(d) O4 (üle 10t)'),
                               ('OTHER_2012', '(m) Muu')
                          ) AS t(code, name)
            LOOP
                INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, created_by)
                VALUES (
                           nextval('classifier.seq_classifier_value_key'),
                           v_clf_key,
                           v_rec.code,
                           v_rec.name,
                           CURRENT_DATE,
                           NULL,
                           v_created_by
                       );
            END LOOP;

    END $$;

DO $$
    DECLARE
        v_created_by    VARCHAR(100) := 'system';
        v_clf_key       BIGINT;       -- classifier_key for VEHICLE_CATEGORY
        v_rec           RECORD;
    BEGIN

        IF EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'VEHICLE_CATEGORY') THEN
            RAISE NOTICE 'VEHICLE_CATEGORY already exists, skipping';
            CONTINUE;
        END IF;

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (
                   nextval('classifier.seq_classifier_key'),
                   'VEHICLE_CATEGORY',
                   'Mootorsõiduki kategooria',
                   'Mootorsõiduki kategooriate klassifikaator (kontrollvormid 2012)',
                   v_created_by
               )
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN
            SELECT * FROM (VALUES
                               ('A_2012',     '(a) N2 (3,5 – 12 t)'),
                               ('B_2012',     '(b) N3 (üle 12 t)'),
                               ('E_2012',     '(e) M2 (rohkem kui 9 istekohta kuni 5t)'),
                               ('F_2012',     '(f) M3 (rohkem kui 9 istekohta rohkem kui 5t)'),
                               ('G3_2012',    '(g) T1b'),
                               ('H2_2012',    '(h) T2b'),
                               ('I_2012',     '(i) T3b'),
                               ('J_2012',     '(j) T4.1b'),
                               ('K_2012',     '(k) T4.2b'),
                               ('L_2012',     '(l) T4.3b'),
                               ('OTHER_2012', '(m) Muu')
                          ) AS t(code, name)
            LOOP
                INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, created_by)
                VALUES (
                           nextval('classifier.seq_classifier_value_key'),
                           v_clf_key,
                           v_rec.code,
                           v_rec.name,
                           CURRENT_DATE,
                           NULL,
                           v_created_by
                       );
            END LOOP;

    END $$;

DO $$
    DECLARE
        v_created_by    VARCHAR(100) := 'system';
        v_clf_key       BIGINT;       -- classifier_key for MASS_DIMENSION
        v_rec           RECORD;
    BEGIN

        IF EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'MASS_DIMENSION') THEN
            RAISE NOTICE 'MASS_DIMENSION already exists, skipping';
            CONTINUE;
        END IF;

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (
                   nextval('classifier.seq_classifier_key'),
                   'MASS_DIMENSION',
                   'Sõiduki massi ja mõõtmete kontroll',
                   'Sõiduki massi ja mõõtmete rikkumiste klassifikaator',
                   v_created_by
               )
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN
            SELECT * FROM (VALUES
                               ('MASS_N3',       'Ületatakse suurimat lubatud massi N3-kategooria sõidukiga',  'Mass'),
                               ('MASS_N2',       'Ületatakse suurimat lubatud massi N2-kategooria sõidukiga',  'Mass'),
                               ('PIKKUS',        'Ületatakse suurimat lubatud pikkust',                        'Pikkus'),
                               ('LAIUS',         'Ületatakse suurimat lubatud laiust',                         'Laius'),
                               ('KORGUS',        'Kõrgus',                                                     NULL),
                               ('TELJEKOORMUS',  'Teljekoormus',                                               NULL)
                          ) AS t(code, name, description)
            LOOP
                INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
                VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL, NULL, v_rec.description, v_created_by);
            END LOOP;

        FOR v_rec IN
            SELECT * FROM (VALUES
                               -- Mass N3
                               ('SI922',            '5% ≤ ... < 10%',           'SI',   'MASS_N3'),
                               ('VSI843',           '10% ≤ ... < 20%',          'VSI',  'MASS_N3'),
                               ('MSI701',           '20% ≤ ...',                'MSI',  'MASS_N3'),
                               -- Mass N2
                               ('SI923',            '5% ≤ ... < 15%',           'SI',   'MASS_N2'),
                               ('VSI844',           '15% ≤ ... < 25%',          'VSI',  'MASS_N2'),
                               ('MSI702',           '25% ≤ ...',                'MSI',  'MASS_N2'),
                               -- Pikkus
                               ('SI924',            '2% < ... < 20%',           'SI',   'PIKKUS'),
                               ('VSI845',           '20% ≤ ...',                'VSI',  'PIKKUS'),
                               -- Laius
                               ('SI925',            '2,65 ≤ ... < 3,10 m',      'SI',   'LAIUS'),
                               ('VSI846',           '3,10 m ≤ ...',             'VSI',  'LAIUS'),
                               -- Kõrgus (no severity code)
                               ('KORGUS_01',        'Ei vasta nõuetele',        NULL,   'KORGUS'),
                               -- Teljekoormus (no severity code)
                               ('TELJEKOORMUS_01',  'Ei vasta nõuetele',        NULL,   'TELJEKOORMUS')
                          ) AS t(code, name, severity, parent_code)
            LOOP
                INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
                VALUES (
                           nextval('classifier.seq_classifier_value_key'),
                           v_clf_key,
                           v_rec.code,
                           v_rec.name,
                           CURRENT_DATE,
                           NULL,
                           (SELECT classifier_value_key FROM classifier.classifier_value WHERE classifier_key = v_clf_key AND code = v_rec.parent_code ORDER BY created_at DESC LIMIT 1),
                           v_rec.severity,
                           v_created_by
                       );
            END LOOP;

    END $$;
