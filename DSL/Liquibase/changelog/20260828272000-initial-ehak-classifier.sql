-- liquibase formatted sql
-- changeset ljvis:20260828272000 splitStatements:false
--
-- EHAK — Eesti haldus- ja asustusjaotuse klassifikaator (2024v1). Maakonnad, linnad, vallad.
-- Idempotentne: olemasolevad klassifikaatorid jäetakse vahele.

DO $$
    DECLARE
        v_created_by    VARCHAR(100) := 'system';
        v_clf_key       BIGINT;       -- classifier_key for EHAK
        v_rec           RECORD;
    BEGIN

        IF EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'EHAK') THEN
            RAISE NOTICE 'EHAK already exists, skipping';
            RETURN;
        END IF;

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (nextval('classifier.seq_classifier_key'), 'EHAK', 'EHAK', 'Eesti haldus- ja asustusjaotuse klassifikaator (2024v1) — maakonnad, linnad ja vallad', v_created_by)
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN
            SELECT * FROM (VALUES
                               ('0037', 'Harju maakond'),
                               ('0039', 'Hiiu maakond'),
                               ('0045', 'Ida-Viru maakond'),
                               ('0050', 'Jõgeva maakond'),
                               ('0052', 'Järva maakond'),
                               ('0056', 'Lääne maakond'),
                               ('0060', 'Lääne-Viru maakond'),
                               ('0064', 'Põlva maakond'),
                               ('0068', 'Pärnu maakond'),
                               ('0071', 'Rapla maakond'),
                               ('0074', 'Saare maakond'),
                               ('0079', 'Tartu maakond'),
                               ('0081', 'Valga maakond'),
                               ('0084', 'Viljandi maakond'),
                               ('0087', 'Võru maakond')
                          ) AS t(code, name)
            LOOP
                INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, created_by)
                VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL, NULL, v_created_by);
            END LOOP;

        FOR v_rec IN
            SELECT * FROM (VALUES
                               -- Harju maakond (0037)
                               ('0141', 'Anija vald',           '0037'),
                               ('0198', 'Harku vald',           '0037'),
                               ('0245', 'Jõelähtme vald',       '0037'),
                               ('0296', 'Keila linn',           '0037'),
                               ('0305', 'Kiili vald',           '0037'),
                               ('0338', 'Kose vald',            '0037'),
                               ('0353', 'Kuusalu vald',         '0037'),
                               ('0424', 'Loksa linn',           '0037'),
                               ('0431', 'Lääne-Harju vald',     '0037'),
                               ('0446', 'Maardu linn',          '0037'),
                               ('0651', 'Raasiku vald',         '0037'),
                               ('0653', 'Rae vald',             '0037'),
                               ('0719', 'Saku vald',            '0037'),
                               ('0725', 'Saue vald',            '0037'),
                               ('0784', 'Tallinn',              '0037'),
                               ('0890', 'Viimsi vald',          '0037'),
                               -- Hiiu maakond (0039)
                               ('0205', 'Hiiumaa vald',         '0039'),
                               -- Ida-Viru maakond (0045)
                               ('0130', 'Alutaguse vald',       '0045'),
                               ('0251', 'Jõhvi vald',           '0045'),
                               ('0321', 'Kohtla-Järve linn',    '0045'),
                               ('0442', 'Lüganuse vald',        '0045'),
                               ('0511', 'Narva linn',           '0045'),
                               ('0515', 'Narva-Jõesuu linn',    '0045'),
                               ('0736', 'Sillamäe linn',        '0045'),
                               ('0803', 'Toila vald',           '0045'),
                               -- Jõgeva maakond (0050)
                               ('0247', 'Jõgeva vald',          '0050'),
                               ('0486', 'Mustvee vald',         '0050'),
                               ('0618', 'Põltsamaa vald',       '0050'),
                               -- Järva maakond (0052)
                               ('0255', 'Järva vald',           '0052'),
                               ('0567', 'Paide linn',           '0052'),
                               ('0834', 'Türi vald',            '0052'),
                               -- Lääne maakond (0056)
                               ('0184', 'Haapsalu linn',        '0056'),
                               ('0441', 'Lääne-Nigula vald',    '0056'),
                               ('0907', 'Vormsi vald',          '0056'),
                               -- Lääne-Viru maakond (0060)
                               ('0191', 'Haljala vald',         '0060'),
                               ('0272', 'Kadrina vald',         '0060'),
                               ('0661', 'Rakvere vald',         '0060'),
                               ('0663', 'Rakvere linn',         '0060'),
                               ('0792', 'Tapa vald',            '0060'),
                               ('0901', 'Vinni vald',           '0060'),
                               ('0903', 'Viru-Nigula vald',     '0060'),
                               ('0928', 'Väike-Maarja vald',    '0060'),
                               -- Põlva maakond (0064)
                               ('0284', 'Kanepi vald',          '0064'),
                               ('0622', 'Põlva vald',           '0064'),
                               ('0708', 'Räpina vald',          '0064'),
                               -- Pärnu maakond (0068)
                               ('0214', 'Häädemeeste vald',     '0068'),
                               ('0303', 'Kihnu vald',           '0068'),
                               ('0430', 'Lääneranna vald',      '0068'),
                               ('0624', 'Pärnu linn',           '0068'),
                               ('0638', 'Põhja-Pärnumaa vald',  '0068'),
                               ('0712', 'Saarde vald',          '0068'),
                               ('0809', 'Tori vald',            '0068'),
                               -- Rapla maakond (0071)
                               ('0293', 'Kehtna vald',          '0071'),
                               ('0317', 'Kohila vald',          '0071'),
                               ('0502', 'Märjamaa vald',        '0071'),
                               ('0668', 'Rapla vald',           '0071'),
                               -- Saare maakond (0074)
                               ('0478', 'Muhu vald',            '0074'),
                               ('0689', 'Ruhnu vald',           '0074'),
                               ('0714', 'Saaremaa vald',        '0074'),
                               -- Tartu maakond (0079)
                               ('0171', 'Elva vald',            '0079'),
                               ('0283', 'Kambja vald',          '0079'),
                               ('0291', 'Kastre vald',          '0079'),
                               ('0432', 'Luunja vald',          '0079'),
                               ('0528', 'Nõo vald',             '0079'),
                               ('0586', 'Peipsiääre vald',      '0079'),
                               ('0793', 'Tartu linn',           '0079'),
                               ('0796', 'Tartu vald',           '0079'),
                               -- Valga maakond (0081)
                               ('0557', 'Otepää vald',          '0081'),
                               ('0824', 'Tõrva vald',           '0081'),
                               ('0857', 'Valga vald',           '0081'),
                               -- Viljandi maakond (0084)
                               ('0480', 'Mulgi vald',           '0084'),
                               ('0615', 'Põhja-Sakala vald',    '0084'),
                               ('0897', 'Viljandi linn',        '0084'),
                               ('0899', 'Viljandi vald',        '0084'),
                               -- Võru maakond (0087)
                               ('0145', 'Antsla vald',          '0087'),
                               ('0698', 'Rõuge vald',           '0087'),
                               ('0732', 'Setomaa vald',         '0087'),
                               ('0917', 'Võru vald',            '0087'),
                               ('0919', 'Võru linn',            '0087')
                          ) AS t(code, name, parent_code)
            LOOP
                INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, created_by)
                VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL,
                    (SELECT classifier_value_key FROM classifier.classifier_value WHERE classifier_key = v_clf_key AND code = v_rec.parent_code ORDER BY created_at DESC LIMIT 1),
                    v_created_by);
            END LOOP;

    END $$;

