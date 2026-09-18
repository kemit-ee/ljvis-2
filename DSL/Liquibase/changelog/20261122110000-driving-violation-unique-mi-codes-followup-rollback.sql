-- liquibase formatted sql
-- changeset ljvis:20261122110000-rollback ignore:true splitStatements:false
DO $$
    DECLARE
        v_classifier_key BIGINT;
        v_parent_key     BIGINT;
        v_row            RECORD;
    BEGIN
        SELECT classifier_key INTO v_classifier_key
          FROM classifier.classifier
         WHERE code = 'DRIVING_VIOLATION'
         ORDER BY created_at DESC LIMIT 1;

        IF v_classifier_key IS NULL THEN
            RAISE NOTICE 'DRIVING_VIOLATION classifier not found, skipping';
            RETURN;
        END IF;

        FOR v_row IN SELECT * FROM (VALUES
            ('MEESKOND_01'),
            ('ANDMETE_ESITAMINE_03'),
            ('ANDMETE_ESITAMINE_04')
        ) AS t(parent_code)
        LOOP
            SELECT classifier_value_key INTO v_parent_key
              FROM classifier.classifier_value
             WHERE classifier_key = v_classifier_key AND code = v_row.parent_code
             ORDER BY created_at DESC LIMIT 1;

            IF v_parent_key IS NULL THEN
                CONTINUE;
            END IF;

            UPDATE classifier.classifier_value
               SET code = 'MI'
             WHERE classifier_key = v_classifier_key
               AND parent_key = v_parent_key
               AND code = v_row.parent_code || '_MI';
        END LOOP;
    END $$;
