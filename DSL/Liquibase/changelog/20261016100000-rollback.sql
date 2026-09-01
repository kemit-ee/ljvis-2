-- liquibase formatted sql
-- changeset ljvis:20261016100000-rollback splitStatements:false
--
-- Rollback 20261016100000: eemaldab lisatud level-3 read.

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
          AND created_by = 'system'
          AND parent_key IN (
              SELECT classifier_value_key FROM classifier.classifier_value
              WHERE classifier_key = v_clf_key
                AND code IN (
                    'MEESKOND_01', 'PUHKEPERIOODID_08', 'PUHKEPERIOODID_09', 'PUHKEPERIOODID_10',
                    'TOOKORRALDUS_01', 'SOIDUMEERIKU_PAIGALDAMINE_01', 'SOIDUMEERIKUD_01',
                    'SOIDUMEERIKUD_08', 'ANDMETE_ESITAMINE_01', 'ANDMETE_ESITAMINE_02',
                    'ANDMETE_ESITAMINE_03', 'ANDMETE_ESITAMINE_04', 'ANDMETE_ESITAMINE_05',
                    'ANDMETE_ESITAMINE_06', 'ANDMETE_ESITAMINE_07', 'RIKKED_01'
                )
          )
          AND code IN (
              'MI', 'VSI843', 'SI922', 'SI923', 'SI924', 'MSI604', 'VSI844', 'MSI605',
              'SI925', 'SI926', 'VSI845', 'VSI846', 'VSI847', 'SI927'
          );
    END $$;
