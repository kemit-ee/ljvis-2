-- liquibase formatted sql
-- changeset ljvis:20261022110000 ignore:true splitStatements:false
--
-- Code review leid: formRoutes.ts annab tram_driver_form-ile
-- classifierCode: 'TRAM_KONTROLLKAART', aga see FORM_TYPE klassifikaatori
-- väärtus puudus kõigist seemnefailidest (20260828270000 ja
-- 20260630100002 loodi enne trammi kontrollkaardi lisamist). Ilma selle
-- väärtuseta ei jõua tram_driver_form kunagi getAvailableFormKeys
-- tulemusse — "Vormid" plokis ei kuvata Transpordiameti kontrollkaarti,
-- kuigi tram_driver_form.write õigus on reaalselt olemas (vt
-- 20260829121000-initial-permissions-tram-form.sql).
--
-- Idempotentne: lisab väärtuse ainult siis, kui seda veel pole
-- (nt dev-keskkonnas, kus see on vahepeal käsitsi lisatud).

DO $$
    DECLARE
        v_created_by VARCHAR(100) := 'system';
        v_clf_key    BIGINT;
    BEGIN
        SELECT classifier_key INTO v_clf_key FROM classifier.classifier WHERE code = 'FORM_TYPE';

        IF v_clf_key IS NULL THEN
            RAISE NOTICE 'FORM_TYPE classifier not found, skipping';
            RETURN;
        END IF;

        IF EXISTS (SELECT 1 FROM classifier.classifier_value
                   WHERE classifier_key = v_clf_key AND code = 'TRAM_KONTROLLKAART') THEN
            RAISE NOTICE 'TRAM_KONTROLLKAART already exists, skipping';
            RETURN;
        END IF;

        INSERT INTO classifier.classifier_value
            (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
        VALUES (
                   nextval('classifier.seq_classifier_value_key'),
                   v_clf_key,
                   'TRAM_KONTROLLKAART',
                   'Transpordiameti kontrollkaart',
                   CURRENT_DATE,
                   NULL,
                   NULL,
                   'DASHBOARD_MANUAL_ADD',
                   v_created_by
               );
    END $$;
