-- liquibase formatted sql
-- changeset ljvis:20261119100000-rollback ignore:true splitStatements:false
--
-- Rollback 20261119100000: taastab VSI869/VSI872 kirjeldused 20260828275000
-- seemne väärtusele (mõlemal identne tekst).

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
            RETURN;
        END IF;

        FOR v_rec IN
            SELECT * FROM (VALUES
                ('VSI869', 'kabotaažvedu ei vasta vastuvõtvas liikmesriigis kehtivatele õigus- ja haldusnormidele'),
                ('VSI872', 'kabotaažvedu ei vasta vastuvõtvas liikmesriigis kehtivatele õigus- ja haldusnormidele'),
                ('VSI873', 'sõidukis ei ole või ei ole kontrollima volitatud ametniku nõudmisel võimalik esitada kabotaažvedudeks vajalikke kontrolldokumente (juhuvedude sõiduleht või eriotstarbeliste liinivedude korral vedaja ja veo korraldaja vahel sõlmitud leping või selle tõestatud koopia)')
            ) AS t(code, old_name)
        LOOP
            UPDATE classifier.classifier_value
            SET name = v_rec.old_name
            WHERE classifier_key = v_clf_key
              AND code = v_rec.code
              AND name <> v_rec.old_name;
        END LOOP;
    END $$;
