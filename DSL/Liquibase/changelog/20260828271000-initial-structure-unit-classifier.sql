-- liquibase formatted sql
-- changeset ljvis:20260828271000 splitStatements:false
--
-- STRUCTURE_UNIT — struktuuriüksuste klassifikaator (PPA prefektuurid, KLIM, TRAM).
-- Idempotentne: kui STRUCTURE_UNIT juba eksisteerib, jäetakse INSERT vahele.

DO $$
    DECLARE
        v_created_by    VARCHAR(100) := 'system';
        v_clf_key       BIGINT;
        v_rec           RECORD;
    BEGIN
        IF EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'STRUCTURE_UNIT') THEN
            RAISE NOTICE 'STRUCTURE_UNIT already exists, skipping';
            RETURN;
        END IF;

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (
                   nextval('classifier.seq_classifier_key'),
                   'STRUCTURE_UNIT',
                   'Struktuuriüksus',
                   'Organisatsioonide struktuuriüksuste klassifikaator',
                   v_created_by
               )
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN
            SELECT * FROM (VALUES
                               ('PPA_LOUNA', 'Lõuna prefektuur',    'PPA'),
                               ('PPA_IDA',   'Ida prefektuur',      'PPA'),
                               ('PPA_LAANE', 'Lääne prefektuur',    'PPA'),
                               ('PPA_POHJA', 'Põhja prefektuur',    'PPA'),
                               ('KLIM_HQ',  'Kliimaministeerium',   'KLIM'),
                               ('TRAM_HQ',  'Transpordiamet',       'TRAM')
                          ) AS t(code, name, org_code)
            LOOP
                INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, description, valid_from, valid_until, created_by)
                VALUES (
                           nextval('classifier.seq_classifier_value_key'),
                           v_clf_key,
                           v_rec.code,
                           v_rec.name,
                           v_rec.org_code,
                           CURRENT_DATE,
                           NULL,
                           v_created_by
                       );
            END LOOP;


    END $$;
