-- liquibase formatted sql
-- changeset ljvis:20260901130000-rollback ignore:true splitStatements:false
--
-- Rollback 20260901130000: nimeta <parent_code>_MI tase-3 koodid tagasi 'MI'-ks.

DO $$
    DECLARE
        v_clf_key    BIGINT;
        v_parent_key BIGINT;
        v_rec        RECORD;
    BEGIN
        SELECT classifier_key INTO v_clf_key
        FROM classifier.classifier
        WHERE code = 'DRIVING_VIOLATION'
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_clf_key IS NULL THEN
            RETURN;
        END IF;

        FOR v_rec IN
            SELECT unnest(ARRAY[
                'SOIDUAJAD_03', 'SOIDUAJAD_05', 'SOIDUAJAD_07',
                'VAHEAJAD_561_01',
                'PUHKEPERIOODID_01', 'PUHKEPERIOODID_02', 'PUHKEPERIOODID_03',
                'PUHKEPERIOODID_04', 'PUHKEPERIOODID_05', 'PUHKEPERIOODID_06',
                'PUHKEPERIOODID_07',
                'PAEVA_12_ERAND_01', 'PAEVA_12_ERAND_02',
                'MEESKOND_01',
                'ANDMETE_ESITAMINE_03', 'ANDMETE_ESITAMINE_04',
                'ROOMA_I_01',
                'LAHETAMINE_01', 'LAHETAMINE_02', 'LAHETAMINE_03', 'LAHETAMINE_04',
                'LAHETAMINE_05', 'LAHETAMINE_06', 'LAHETAMINE_07'
            ]) AS parent_code
        LOOP
            SELECT classifier_value_key INTO v_parent_key
            FROM classifier.classifier_value
            WHERE classifier_key = v_clf_key AND code = v_rec.parent_code
            ORDER BY created_at DESC
            LIMIT 1;

            IF v_parent_key IS NULL THEN
                CONTINUE;
            END IF;

            UPDATE classifier.classifier_value
            SET code = 'MI'
            WHERE classifier_key = v_clf_key
              AND parent_key = v_parent_key
              AND code = v_rec.parent_code || '_MI';
        END LOOP;
    END $$;
