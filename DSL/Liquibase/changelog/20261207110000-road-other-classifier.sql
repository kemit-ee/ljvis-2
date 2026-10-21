-- liquibase formatted sql
-- changeset ljvis:20261207110000 splitStatements:false
--
-- ROAD_OTHER — muude teede loetelu (ministri määruse "Muud teed"). Väärtuse kood = tee number,
-- nimi = tee nimetus. Kontrollkaardi üldosas täidab tee numbri sisestamine "Muu tee" välja
-- automaatselt. Loetelu täidetakse klassifikaatorite haldusvaates.

DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'ROAD_OTHER') THEN
            RAISE NOTICE 'ROAD_OTHER already exists, skipping';
            RETURN;
        END IF;

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (
                   nextval('classifier.seq_classifier_key'),
                   'ROAD_OTHER',
                   'Muu tee',
                   'Muude teede loetelu: kood = tee number, nimi = tee nimetus',
                   'system'
               );
    END $$;
