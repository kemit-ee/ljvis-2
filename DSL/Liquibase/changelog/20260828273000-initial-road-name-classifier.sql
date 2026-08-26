-- liquibase formatted sql
-- changeset ljvis:20260828273000 splitStatements:false
--
-- ROAD_NAME — põhimaanteed (KLIM määrus nr 48). Autoveo katkestamise vormi jaoks.
-- Idempotentne: olemasolevad klassifikaatorid jäetakse vahele.

DO $$
    DECLARE
        v_created_by    VARCHAR(100) := 'system';
        v_clf_key       BIGINT;       -- classifier_key for ROAD_NAME
        v_rec           RECORD;
    BEGIN

        IF EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'ROAD_NAME') THEN
            RAISE NOTICE 'ROAD_NAME already exists, skipping';
            RETURN;
        END IF;

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (
                   nextval('classifier.seq_classifier_key'),
                   'ROAD_NAME',
                   'Maantee nimi',
                   'Põhimaanteede nimede klassifikaator (KLIM määrus nr 48)',
                   v_created_by
               )
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN
            SELECT * FROM (VALUES
                               ('tallinna_narva',                       'TALLINNA–NARVA TEE (TEE NR 1)'),
                               ('tallinna_tartu_voru_luhamaa',           'TALLINNA–TARTU–VÕRU–LUHAMAA TEE (TEE NR 2)'),
                               ('johvi_tartu_valga',                     'JÕHVI–TARTU–VALGA TEE (TEE NR 3)'),
                               ('tallinna_parnu_ikla',                   'TALLINNA–PÄRNU–IKLA TEE (TEE NR 4)'),
                               ('parnu_paide_rakvere',                   'PÄRNU–PAIDE–RAKVERE TEE (TEE NR 5)'),
                               ('valga_uulu',                            'VALGA–UULU TEE (TEE NR 6)'),
                               ('riia_pihkva',                           'RIIA–PIHKVA TEE (TEE NR 7)'),
                               ('tallinna_paldiski',                     'TALLINNA–PALDISKI TEE (TEE NR 8)'),
                               ('aasmae_haapsalu_rohukula',              'ÄÄSMÄE–HAAPSALU–ROHUKÜLA TEE (TEE NR 9)'),
                               ('risti_virtsu_kuivastu_kuressaare',      'RISTI–VIRTSU–KUIVASTU–KURESSAARE TEE (TEE NR 10)'),
                               ('tallinna_ringtee',                      'TALLINNA RINGTEE (TEE NR 11)'),
                               ('tartu_viljandi_kilingi_nomme',          'TARTU–VILJANDI–KILINGI-NÕMME TEE (TEE NR 92)'),
                               ('muu_tee',                               'MUU TEE')
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

