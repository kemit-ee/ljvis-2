-- liquibase formatted sql
-- changeset ljvis:20260903130000-rollback ignore:true splitStatements:false
--
-- Rollback 20260903130000: eemaldab ADR_QUANTITY_UNIT klassifikaatori ja väärtused.

DO $$
    DECLARE
        v_clf_key BIGINT;
    BEGIN
        SELECT classifier_key INTO v_clf_key
        FROM classifier.classifier
        WHERE code = 'ADR_QUANTITY_UNIT'
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_clf_key IS NULL THEN
            RETURN;
        END IF;

        DELETE FROM classifier.classifier_value WHERE classifier_key = v_clf_key;
        DELETE FROM classifier.classifier WHERE classifier_key = v_clf_key;
    END $$;
