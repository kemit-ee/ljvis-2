-- liquibase formatted sql
-- changeset ljvis:20260903130000 ignore:true splitStatements:false
--
-- ADR_QUANTITY_UNIT — ohtliku veose (ADR) kontrollvormi "Veetavate ohtlike
-- kaupade andmed" ploki koguse ühik (LJVIS2 #230, epic #228).
-- Kliimaministri määruse (RT I, 16.06.2026, 11) lisa 1 kohaselt on "Ühik"
-- valik kindlast loendist; "Kogus" jääb arvväljaks.
--
-- 1-tasemeline klassifikaator, 8 väärtust. code = masinloetav, name = kuvasilt.
--
-- Idempotentne: kui klassifikaator on juba olemas, jäetakse vahele.

DO $$
    DECLARE
        v_created_by VARCHAR(100) := 'system';
        v_clf_key    BIGINT;
        v_rec        RECORD;
    BEGIN
        IF EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'ADR_QUANTITY_UNIT') THEN
            RAISE NOTICE 'ADR_QUANTITY_UNIT already exists, skipping';
            RETURN;
        END IF;

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (
                   nextval('classifier.seq_classifier_key'),
                   'ADR_QUANTITY_UNIT',
                   'Ohtliku kauba koguse ühik',
                   'Ohtliku veose (ADR) kontrollvormi veetavate ohtlike kaupade koguse mõõtühik.',
                   v_created_by
               )
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN
            SELECT * FROM (VALUES
                ('l',        'l'),
                ('kg',       'kg'),
                ('t',        't'),
                ('m3',       'm³'),
                ('tk',       'tk'),
                ('pakendit', 'pakendit'),
                ('ballooni', 'ballooni'),
                ('nem_kg',   'NEM kg')
            ) AS t(code, name)
        LOOP
            INSERT INTO classifier.classifier_value
                (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key,
                    v_rec.code, v_rec.name, CURRENT_DATE, NULL, NULL, NULL, v_created_by);
        END LOOP;
    END $$;
