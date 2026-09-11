-- liquibase formatted sql
-- changeset ljvis:20261119100000 ignore:true splitStatements:false
--
-- EU_INFRINGEMENT: eristab kaks identse kirjeldusega kabotaaži-koodi (#328 p1).
-- Seemnes (20260828275000) on VSI869 ja VSI872 sama tekstiga
-- "kabotaažvedu ei vasta vastuvõtvas liikmesriigis kehtivatele õigus- ja
-- haldusnormidele" — need on aga eri rikkumised:
--   VSI869 = VEOSEVEO kabotaaž   — määrus (EÜ) nr 1072/2009 art 8 lg 2
--   VSI872 = SÕITJATEVEO kabotaaž — määrus (EÜ) nr 1073/2009 art 16 (buss/tramm)
-- (vrd CARGO_CABOTAGE_VIOLATION / PASSENGER_CABOTAGE_VIOLATION klassifikaatorid,
--  mis eristavad neid juba määruse viitega nimes.)
--
-- Forward-only UPDATE `name` väljale, sama muster kui 20260901110000. Koodi ei
-- muudeta (salvestatud vormide `violations` väärtused ei orvu). Idempotentne
-- (`name <> <uus>`). EU_INFRINGEMENT seemnendatakse 20260828275000-ga, mis
-- jookseb enne — järjekorrasõltuvust ei ole.

DO $$
    DECLARE
        v_clf_key BIGINT;
        v_rec     RECORD;
    BEGIN
        SELECT classifier_key INTO v_clf_key
        FROM classifier.classifier
        WHERE code = 'EU_INFRINGEMENT'
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_clf_key IS NULL THEN
            RAISE NOTICE 'EU_INFRINGEMENT classifier not found, skipping';
            RETURN;
        END IF;

        FOR v_rec IN
            SELECT * FROM (VALUES
                ('VSI869', 'veoseveo kabotaažvedu ei vasta vastuvõtvas liikmesriigis kehtivatele õigus- ja haldusnormidele (määrus (EÜ) nr 1072/2009 art 8 lg 2)'),
                ('VSI872', 'sõitjateveo kabotaažvedu ei vasta vastuvõtvas liikmesriigis kehtivatele õigus- ja haldusnormidele (määrus (EÜ) nr 1073/2009 art 16)')
            ) AS t(code, new_name)
        LOOP
            UPDATE classifier.classifier_value
            SET name = v_rec.new_name
            WHERE classifier_key = v_clf_key
              AND code = v_rec.code
              AND name <> v_rec.new_name;
        END LOOP;
    END $$;
