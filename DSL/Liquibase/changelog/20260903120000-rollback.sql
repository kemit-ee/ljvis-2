-- liquibase formatted sql
-- changeset ljvis:20260903120000-rollback ignore:true splitStatements:false
--
-- Rollback 20260903120000: eemaldab ADR_CONTROL_CHECKPOINT klassifikaatori
-- ja kõik selle väärtused (tase 1 + tase 2).

DO $$
    DECLARE
        v_clf_key BIGINT;
    BEGIN
        SELECT classifier_key INTO v_clf_key
        FROM classifier.classifier
        WHERE code = 'ADR_CONTROL_CHECKPOINT'
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_clf_key IS NULL THEN
            RETURN;
        END IF;

        DELETE FROM classifier.classifier_value WHERE classifier_key = v_clf_key;
        DELETE FROM classifier.classifier WHERE classifier_key = v_clf_key;
    END $$;
