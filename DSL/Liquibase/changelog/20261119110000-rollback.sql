-- liquibase formatted sql
-- changeset ljvis:20261119110000-rollback ignore:true splitStatements:false

DO $$
    DECLARE
        v_clf_key BIGINT;
        v_old_name TEXT := 'sõidukis ei ole või ei ole kontrollima volitatud ametniku nõudmisel võimalik esitada kabotaažvedudeks vajalikke kontrolldokumente (juhuvedude sõiduleht või eriotstarbeliste liinivedude korral vedaja ja veo korraldaja vahel sõlmitud leping või selle tõestatud koopia)';
    BEGIN
        SELECT classifier_key INTO v_clf_key
        FROM classifier.classifier
        WHERE code = 'EU_INFRINGEMENT'
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_clf_key IS NULL THEN
            RETURN;
        END IF;

        UPDATE classifier.classifier_value
        SET name = v_old_name
        WHERE classifier_key = v_clf_key
          AND code = 'VSI873'
          AND name <> v_old_name;
    END $$;
