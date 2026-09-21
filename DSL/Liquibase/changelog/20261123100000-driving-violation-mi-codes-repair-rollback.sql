-- liquibase formatted sql
-- changeset ljvis:20261123100000-rollback ignore:true splitStatements:false
--
-- Rollback 20261123100000: eemaldab kõik selle migratsiooniga lisatud tase-3
-- kirjed, taastades (katkise) eelseisu, kus need 43 rikkumisliiki polnud
-- valitavad.

DO $$
    DECLARE
        v_clf_key BIGINT;
    BEGIN
        SELECT classifier_key INTO v_clf_key
        FROM classifier.classifier
        WHERE code = 'DRIVING_VIOLATION'
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_clf_key IS NULL THEN
            RETURN;
        END IF;

        DELETE FROM classifier.classifier_value
        WHERE classifier_key = v_clf_key
          AND code IN (
            'SOIDUAJAD_01_MI', 'SI901', 'VSI800', 'MSI102',
            'SOIDUAJAD_03_MI', 'SI902', 'VSI801', 'MSI103',
            'SOIDUAJAD_05_MI', 'SI903', 'VSI802', 'MSI104',
            'SOIDUAJAD_07_MI', 'SI904', 'VSI803', 'MSI101',
            'VAHEAJAD_561_01_MI', 'SI905', 'VSI804',
            'PUHKEPERIOODID_01_MI', 'SI906', 'VSI805',
            'PUHKEPERIOODID_02_MI', 'SI907', 'VSI806',
            'PUHKEPERIOODID_03_MI', 'SI908', 'VSI807',
            'PUHKEPERIOODID_04_MI', 'SI909', 'VSI808',
            'PUHKEPERIOODID_05_MI', 'SI910', 'VSI809',
            'PUHKEPERIOODID_06_MI', 'SI911', 'VSI810',
            'PUHKEPERIOODID_07_MI', 'SI912', 'VSI811',
            'PAEVA_12_ERAND_01_MI', 'SI913', 'VSI812',
            'PAEVA_12_ERAND_02_MI', 'SI914', 'VSI813',
            'SI915', 'VSI814',
            'VSI815', 'VSI816',
            'VSI818', 'MSI601', 'MSI602', 'MSI603', 'VSI819', 'VSI820',
            'MSI205', 'VSI821', 'VSI822', 'VSI823', 'VSI824', 'VSI825',
            'VSI826', 'VSI827', 'SI916', 'VSI828',
            'VSI835',
            'SI917', 'VSI836', 'SI918', 'VSI837',
            'SI919', 'VSI838', 'SI920', 'VSI839',
            'SI921', 'VSI840',
            'VSI841', 'VSI842',
            'ROOMA_I_01_MI',
            'LAHETAMINE_01_MI', 'LAHETAMINE_02_MI', 'LAHETAMINE_03_MI',
            'LAHETAMINE_04_MI', 'LAHETAMINE_05_MI', 'LAHETAMINE_06_MI',
            'LAHETAMINE_07_MI'
          );
    END $$;
