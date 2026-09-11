-- liquibase formatted sql
-- changeset ljvis:20261119110000 ignore:true splitStatements:false
--
-- VSI873 täiendus on eraldi migratsioonis, et juba rakendatud 20261119100000
-- kontrollsumma ei muutuks.

DO $$
    DECLARE
        v_clf_key BIGINT;
        v_new_name TEXT := 'sõidukis ei ole või ei ole kontrollima volitatud ametniku nõudmisel võimalik esitada sõitjateveo kabotaažvedudeks vajalikke kontrolldokumente (juhuvedude sõiduleht või eriotstarbeliste liinivedude korral vedaja ja veo korraldaja vahel sõlmitud leping või selle tõestatud koopia) (määrus (EÜ) nr 1073/2009 art 17)';
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

        UPDATE classifier.classifier_value
        SET name = v_new_name
        WHERE classifier_key = v_clf_key
          AND code = 'VSI873'
          AND name <> v_new_name;
    END $$;
