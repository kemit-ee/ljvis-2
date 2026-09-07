-- liquibase formatted sql
-- changeset ljvis:20260907130000 ignore:true splitStatements:false
--
-- ADR_PACKING_GROUP — ohtliku veose (ADR) kontrollvormi "Veetavate ohtlike
-- kaupade andmed" ploki väli "Pakendirühm" (LJVIS2 epic #228).
--
-- Varem oli "Pakendirühm" vabatekst. Nüüd kindlast loendist valik:
--   1) (tühi valik)                                  — frontendi konstant, mitte klassifikaatoris
--   2) I pakendirühm – väga ohtlik aine              code = I
--   3) II pakendirühm – keskmise ohtlikkusega aine   code = II
--   4) III pakendirühm – madala ohtlikkusega aine    code = III
--   5) Ei ole määratud                               code = NA
--
-- Tühi esimene valik lisatakse rippmenüüsse frontendis (nagu riigi valikul),
-- et ekslikult valitud väärtust saaks tühjendada; klassifikaatoris seda ei ole.
--
-- 1-tasemeline klassifikaator, 4 väärtust. Idempotentne.

DO $$
    DECLARE
        v_created_by VARCHAR(100) := 'system';
        v_clf_key    BIGINT;
        v_rec        RECORD;
    BEGIN
        IF EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'ADR_PACKING_GROUP') THEN
            RAISE NOTICE 'ADR_PACKING_GROUP already exists, skipping';
            RETURN;
        END IF;

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (
                   nextval('classifier.seq_classifier_key'),
                   'ADR_PACKING_GROUP',
                   'Ohtliku kauba pakendirühm',
                   'Ohtliku veose (ADR) kontrollvormi veetavate ohtlike kaupade pakendirühm (ADR 2.1.1.3). Rippmenüü esimene tühi valik on frontendi konstant.',
                   v_created_by
               )
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN
            SELECT * FROM (VALUES
                ('I',   'I pakendirühm – väga ohtlik aine'),
                ('II',  'II pakendirühm – keskmise ohtlikkusega aine'),
                ('III', 'III pakendirühm – madala ohtlikkusega aine'),
                ('NA',  'Ei ole määratud')
            ) AS t(code, name)
        LOOP
            INSERT INTO classifier.classifier_value
                (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key,
                    v_rec.code, v_rec.name, CURRENT_DATE, NULL, NULL, NULL, v_created_by);
        END LOOP;
    END $$;
